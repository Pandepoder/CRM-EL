import crypto from "node:crypto";

import { eq } from "drizzle-orm";

import { createAuthenticatedActor } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import type * as ClienteDb from "@/lib/db-client";
import { permissionsForRole } from "@/lib/permissions";

/**
 * La estructura con que se prueban las matrices de «quién ve y quién hace qué» del plan de auditoría de
 * menús (docs/PLAN_AUDITORIA_MENUS.md, §4). Se arma sobre una base desechable (`crearBaseDesechable`):
 *
 *   Tonalá
 *     AT  administración municipal
 *     D   dirección      lidera C  ── L1, L2
 *     L1  líder          lidera B1 ── K1, K2 (capturistas), M1, M2 (brigadistas)
 *     L2  líder          lidera B2 ── M3
 *     DB  OTRA dirección lidera CB ── L4      (dos direcciones en un mismo municipio: el hueco P1)
 *     L4  líder          lidera B4 ── M4
 *   Zapopan
 *     AZ  administración municipal
 *     DZ  dirección      lidera CZ ── L3
 *     L3  líder          lidera B3 ── M5
 *   y el administrador maestro (MA) de la semilla.
 */

const id = (): string => crypto.randomUUID();

export const PERSONAS = ["AT", "D", "L1", "K1", "K2", "M1", "M2", "L2", "M3", "DB", "L4", "M4", "AZ", "DZ", "L3", "M5"] as const;
export type Persona = (typeof PERSONAS)[number] | "MA";

const ROL: Record<(typeof PERSONAS)[number], string> = {
  AT: "admin", D: "direction", L1: "territorial_coordinator", K1: "capturist", K2: "capturist",
  M1: "visit_responsible", M2: "visit_responsible", L2: "territorial_coordinator", M3: "visit_responsible",
  DB: "direction", L4: "territorial_coordinator", M4: "visit_responsible",
  AZ: "admin", DZ: "direction", L3: "territorial_coordinator", M5: "visit_responsible"
};

const MUNICIPIO: Record<(typeof PERSONAS)[number], string> = {
  AT: "Tonalá", D: "Tonalá", L1: "Tonalá", K1: "Tonalá", K2: "Tonalá", M1: "Tonalá", M2: "Tonalá", L2: "Tonalá", M3: "Tonalá",
  DB: "Tonalá", L4: "Tonalá", M4: "Tonalá",
  AZ: "Zapopan", DZ: "Zapopan", L3: "Zapopan", M5: "Zapopan"
};

export type EstructuraDePrueba = {
  u: Record<Persona, string>;
  t: Record<"C" | "B1" | "B2" | "CB" | "B4" | "CZ" | "B3", string>;
  rol: (p: Persona) => string;
  /** El nombre corto («L1») de un id de persona, para que los mensajes de las pruebas se lean. */
  quien: (personaId: string) => string;
  actor: (p: Persona) => ReturnType<typeof createAuthenticatedActor>;
};

export async function crearEstructuraDePrueba(db: ReturnType<typeof ClienteDb.getDatabaseClient>): Promise<EstructuraDePrueba> {
  const roles = Object.fromEntries((await db.select({ id: schema.roles.id, key: schema.roles.key }).from(schema.roles)).map((r) => [r.key, r.id]));
  const [maestro] = await db.select({ id: schema.userProfiles.id }).from(schema.userProfiles).where(eq(schema.userProfiles.isMasterAdmin, true)).limit(1);
  if (!maestro) throw new Error("La semilla debía dejar al administrador maestro");

  const u = { MA: maestro.id, ...Object.fromEntries(PERSONAS.map((p) => [p, id()])) } as Record<Persona, string>;
  const t = { C: id(), B1: id(), B2: id(), CB: id(), B4: id(), CZ: id(), B3: id() };

  await db.insert(schema.userProfiles).values(
    PERSONAS.map((p) => ({
      id: u[p],
      email: `zz-${p.toLowerCase()}-${u[p].slice(0, 6)}@prueba.local`,
      displayName: `zz ${p}`,
      roleId: roles[ROL[p]]!,
      status: "active",
      municipality: MUNICIPIO[p]
    }))
  );
  const equipo = (tid: string, lider: Persona, municipio: string) => ({ id: tid, name: `zz equipo de ${lider}`, leaderId: u[lider], municipality: municipio });
  await db.insert(schema.teams).values([
    equipo(t.C, "D", "Tonalá"), equipo(t.B1, "L1", "Tonalá"), equipo(t.B2, "L2", "Tonalá"),
    equipo(t.CB, "DB", "Tonalá"), equipo(t.B4, "L4", "Tonalá"),
    equipo(t.CZ, "DZ", "Zapopan"), equipo(t.B3, "L3", "Zapopan")
  ]);
  const integrantes: Array<[string, Persona]> = [
    [t.C, "L1"], [t.C, "L2"],
    [t.B1, "K1"], [t.B1, "K2"], [t.B1, "M1"], [t.B1, "M2"],
    [t.B2, "M3"],
    [t.CB, "L4"], [t.B4, "M4"],
    [t.CZ, "L3"], [t.B3, "M5"]
  ];
  await db.insert(schema.teamMembers).values(integrantes.map(([teamId, p]) => ({ teamId, userId: u[p] })));

  const nombrePorId = new Map(Object.entries(u).map(([k, v]) => [v, k]));
  const rol = (p: Persona) => (p === "MA" ? "admin" : ROL[p]);
  return {
    u,
    t,
    rol,
    quien: (personaId) => nombrePorId.get(personaId) ?? "otra",
    actor: (p) =>
      createAuthenticatedActor({
        actorId: u[p],
        // El maestro entra con su rol y con `master_admin`, como lo arma la sesión (`rolesDeAcceso`).
        roles: p === "MA" ? ["admin", "master_admin"] : [rol(p)],
        permissions: permissionsForRole(rol(p)),
        correlationId: id(),
        authenticationMethod: "password",
        requestStartedAt: new Date()
      })
  };
}
