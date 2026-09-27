import "dotenv/config";

import crypto from "node:crypto";

import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createAuthenticatedActor, type ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";
import { permissionsForRole } from "@/lib/permissions";

import { crearBaseDesechable } from "./base-desechable";

/**
 * El tablero de /admin-equipos y la API de integrantes, contra una base desechable. El tablero solo debe
 * ofrecer lo que la API acepta:
 *
 * - una administradora municipal ve como columnas los equipos de su municipio y puede sumar a la gente de
 *   su municipio, no a la de otro;
 * - un líder, solo su equipo, y solo a quien él invitó;
 * - el maestro, todo.
 */

const sesion: { actor: ActorContext | null } = { actor: null };
vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return { ...original, actorFromSession: async () => sesion.actor };
});

const integrantes = await import("../app/api/admin/teams/[id]/members/route");
const { getDatabaseClient } = await import("@/lib/db-client");
const { tableroDeEquipos, permisoSobreIntegrantes, motivoParaNoSumar } = await import("@/lib/integrantes-equipo");
const { resolveUserNetworkScope } = await import("@/lib/network-hierarchy");

const id = (): string => crypto.randomUUID();
const db = () => getDatabaseClient();
const u = { A: id(), L: id(), L2: id(), B: id(), X: id(), Z: id(), LZ: id() };
const equipo = { T: id(), T2: id(), TZ: id() };
let maestro = "";
let base: Awaited<ReturnType<typeof crearBaseDesechable>>;

function como(userId: string, rol: string, esMaestro = false) {
  sesion.actor = createAuthenticatedActor({
    actorId: userId,
    roles: esMaestro ? [rol, "master_admin"] : [rol],
    permissions: permissionsForRole(rol),
    correlationId: id(),
    authenticationMethod: "password",
    requestStartedAt: new Date()
  });
}
const sumar = async (teamId: string, userId: string) =>
  (await integrantes.POST(new NextRequest(`http://localhost/api/admin/teams/${teamId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) }), { params: Promise.resolve({ id: teamId }) })).status;
const quitar = async (teamId: string, userId: string) =>
  (await integrantes.DELETE(new NextRequest(`http://localhost/api/admin/teams/${teamId}/members?userId=${userId}`, { method: "DELETE" }), { params: Promise.resolve({ id: teamId }) })).status;

beforeAll(async () => {
  base = await crearBaseDesechable("tablero");
  const roles = Object.fromEntries((await db().select({ id: schema.roles.id, key: schema.roles.key }).from(schema.roles)).map((r) => [r.key, r.id]));
  const persona = (pid: string, nombre: string, rol: string, municipio: string, invitadoPor: string | null = null) => ({
    id: pid,
    email: `zz-${nombre}-${pid.slice(0, 6)}@prueba.local`,
    displayName: `zz-${nombre}`,
    roleId: roles[rol]!,
    status: "active",
    municipality: municipio,
    invitedByUserId: invitadoPor
  });
  await db().insert(schema.userProfiles).values([
    persona(u.A, "admin-tonala", "admin", "Tonalá"),
    persona(u.L, "lider", "territorial_coordinator", "Tonalá"),
    persona(u.L2, "lider-2", "territorial_coordinator", "Tonalá"),
    persona(u.LZ, "lider-zapopan", "territorial_coordinator", "Zapopan"),
    persona(u.B, "invitada-por-l", "visit_responsible", "Tonalá", u.L),
    persona(u.X, "no-invitada", "visit_responsible", "Tonalá"),
    persona(u.Z, "de-zapopan", "visit_responsible", "Zapopan")
  ]);
  await db().insert(schema.teams).values([
    { id: equipo.T, name: "zz-Brigada T", leaderId: u.L, municipality: "Tonalá" },
    { id: equipo.T2, name: "zz-Brigada T2", leaderId: u.L2, municipality: "Tonalá" },
    { id: equipo.TZ, name: "zz-Brigada Z", leaderId: u.LZ, municipality: "Zapopan" }
  ]);
  const [m] = await db().select({ id: schema.userProfiles.id }).from(schema.userProfiles).where(eq(schema.userProfiles.isMasterAdmin, true));
  if (!m) throw new Error("La semilla debía dejar un administrador maestro");
  maestro = m.id;
}, 180_000);

afterAll(async () => {
  sesion.actor = null;
  await base?.borrar();
});

const nuestros = (ids: string[]) => ids.filter((x) => Object.values(u).includes(x) || Object.values(equipo).includes(x)).sort();

describe("tablero de equipos", () => {
  it("la administradora municipal: los equipos de su municipio y la gente de su municipio", async () => {
    const t = await tableroDeEquipos(await resolveUserNetworkScope(u.A), u.A);
    expect(nuestros(t.columnas.map((c) => c.id))).toEqual([equipo.T, equipo.T2].sort());
    const disponibles = t.disponibles.map((p) => p.id);
    expect(disponibles).toEqual(expect.arrayContaining([u.L, u.L2, u.B, u.X]));
    expect(disponibles).not.toContain(u.Z);
    expect(disponibles).not.toContain(u.LZ);
    const b = t.disponibles.find((p) => p.id === u.B)!;
    expect(b.equipos).toBe(0);
    expect(t.disponibles.find((p) => p.id === u.L)!.equipos).toBe(1); // al frente de T
  });

  it("el líder: solo su equipo, y solo a quien invitó", async () => {
    const t = await tableroDeEquipos(await resolveUserNetworkScope(u.L), u.L);
    expect(t.columnas.map((c) => c.id)).toEqual([equipo.T]);
    expect(t.columnas[0]!.lider?.id).toBe(u.L);
    expect(t.disponibles.map((p) => p.id)).toEqual([u.B]);
  });

  it("el maestro: todos los equipos y toda la gente", async () => {
    const t = await tableroDeEquipos(await resolveUserNetworkScope(maestro), maestro);
    expect(nuestros(t.columnas.map((c) => c.id))).toEqual([equipo.T, equipo.T2, equipo.TZ].sort());
    expect(t.disponibles.map((p) => p.id)).toEqual(expect.arrayContaining([u.Z, u.X, u.B]));
  });

  it("todo lo que ofrece el tablero lo acepta la API, y nada más", async () => {
    for (const actorId of [u.A, u.L, maestro]) {
      const scope = await resolveUserNetworkScope(actorId);
      const t = await tableroDeEquipos(scope, actorId);
      const ofrecidos = new Set(t.disponibles.map((p) => p.id));
      for (const col of t.columnas.filter((c) => Object.values(equipo).includes(c.id))) {
        const permiso = await permisoSobreIntegrantes(actorId, col.id, scope);
        expect(permiso.ok).toBe(true);
        for (const persona of Object.values(u)) {
          const motivo = await motivoParaNoSumar(permiso, actorId, persona);
          expect({ actorId, persona, acepta: motivo === null }).toEqual({ actorId, persona, acepta: ofrecidos.has(persona) });
        }
      }
    }
  });
});

describe("API de integrantes", () => {
  it("el líder suma y quita a quien invitó; a nadie más", async () => {
    como(u.L, "territorial_coordinator");
    expect(await sumar(equipo.T, u.X)).toBe(403);
    expect(await sumar(equipo.T, u.B)).toBe(200);
    expect(await sumar(equipo.T, u.B)).toBe(400); // ya es integrante
    expect(await sumar(equipo.T2, u.B)).toBe(403); // no es su equipo
    expect(await quitar(equipo.T, u.B)).toBe(200);
  });

  it("la administradora de Tonalá no suma a gente de Zapopan ni toca equipos de Zapopan", async () => {
    como(u.A, "admin");
    expect(await sumar(equipo.T, u.Z)).toBe(403);
    expect(await sumar(equipo.TZ, u.X)).toBe(403);
    expect(await sumar(equipo.T2, u.X)).toBe(200);
    // Sumar no saca de otro equipo: queda en los dos.
    expect(await sumar(equipo.T, u.X)).toBe(200);
    const filas = await db().select().from(schema.teamMembers).where(eq(schema.teamMembers.userId, u.X));
    expect(filas.map((f) => f.teamId).sort()).toEqual([equipo.T, equipo.T2].sort());
    expect(await quitar(equipo.T, u.X)).toBe(200);
    expect(await quitar(equipo.T2, u.X)).toBe(200);
  });

  it("el maestro suma a cualquiera en cualquier equipo", async () => {
    como(maestro, "admin", true);
    expect(await sumar(equipo.TZ, u.X)).toBe(200);
    expect(await quitar(equipo.TZ, u.X)).toBe(200);
  });
});
