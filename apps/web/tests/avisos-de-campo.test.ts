import "dotenv/config";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";

import { crearBaseDesechable } from "./base-desechable";
import { crearEstructuraDePrueba, type EstructuraDePrueba, type Persona } from "./estructura-de-prueba";

/**
 * «Avisar de una incidencia» (plan de auditoría de menús, D9), de punta a punta contra la API con la sesión de
 * cada perfil. El aviso de M1 (brigadista de la brigada B1 de L1, en la coordinación C de D):
 *
 * - entra «por aceptar», sin equipo ni responsable aunque los mande;
 * - lo ven y lo aceptan quienes mandan sobre M1 (L1, D, la administración de Tonalá, el maestro);
 * - su compañero capturista lo ve pero no lo toca; otro brigadista, otra brigada, otra dirección y otro
 *   municipio ni lo ven;
 * - M1 no lo acepta ni lo borra, ni por el mapa ni por la Agenda: solo lo retira, y queda rechazado.
 */

const sesion: { actor: ActorContext | null } = { actor: null };
vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return { ...original, actorFromSession: async () => sesion.actor };
});

const coleccion = await import("../app/api/map/reports/route");
const registro = await import("../app/api/map/reports/[id]/route");

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let x: EstructuraDePrueba;
const db = async () => (await import("@/lib/db-client")).getDatabaseClient();

const como = (p: Persona) => {
  sesion.actor = x.actor(p);
};
const EN_TONALA = { latitude: 20.6248, longitude: -103.2422 };

async function avisar(p: Persona, extra: Record<string, unknown> = {}) {
  como(p);
  const r = await coleccion.POST(
    new Request("http://localhost/api/map/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "zz Luminaria apagada", description: "Aviso de campo de prueba", category: "alumbrado", ...EN_TONALA, ...extra })
    })
  );
  return { estado: r.status, cuerpo: await r.json() };
}

async function cambiar(p: Persona, id: string, cuerpo: Record<string, unknown>) {
  como(p);
  const r = await registro.PATCH(
    new Request(`http://localhost/api/map/reports/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }),
    { params: Promise.resolve({ id }) }
  );
  return { estado: r.status, cuerpo: await r.json().catch(() => ({})) };
}

async function borrar(p: Persona, id: string) {
  como(p);
  const r = await registro.DELETE(new Request(`http://localhost/api/map/reports/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) });
  return r.status;
}

async function idsVisibles(p: Persona): Promise<string[]> {
  como(p);
  const r = await coleccion.GET(new Request("http://localhost/api/map/reports"));
  return ((await r.json()).features ?? []).map((f: { properties: { id: string } }) => f.properties.id);
}

beforeAll(async () => {
  base = await crearBaseDesechable("avisos");
  x = await crearEstructuraDePrueba(await db());
}, 120_000);

afterAll(async () => {
  await base?.borrar();
});

describe("avisar de una incidencia", () => {
  it("el brigadista avisa: entra «por aceptar», sin equipo ni responsable aunque los mande", async () => {
    const { estado, cuerpo } = await avisar("M1", { assignedTeamId: x.t.B2, assignedToUserId: x.u.L2 });
    expect(estado).toBe(201);
    expect(cuerpo.status).toBe("pendiente");
    expect(cuerpo.assignedTeamId).toBeNull();
    expect(cuerpo.assignedToUserId).toBeNull();
    expect(cuerpo.createdByUserId).toBe(x.u.M1);
  });

  it("el capturista también avisa", async () => {
    const { estado, cuerpo } = await avisar("K1");
    expect(estado).toBe(201);
    expect(cuerpo.status).toBe("pendiente");
  });

  it("lo ven quienes mandan sobre quien avisó, y su compañero capturista; nadie más", async () => {
    const { cuerpo } = await avisar("M1");
    const lo = (p: Persona) => idsVisibles(p).then((ids) => ids.includes(cuerpo.id));
    for (const p of ["M1", "K1", "L1", "D", "AT", "MA"] as const) expect(await lo(p), p).toBe(true);
    for (const p of ["M2", "L2", "M3", "DB", "L4", "AZ", "DZ"] as const) expect(await lo(p), p).toBe(false);
  });
});

describe("quién lo acepta", () => {
  it("quien avisó no lo acepta, ni por el mapa ni por la Agenda, y no lo borra", async () => {
    const { cuerpo } = await avisar("M1");
    const r = await cambiar("M1", cuerpo.id, { status: "active" });
    expect(r.estado).toBe(403);
    expect(r.cuerpo.code).toBe("por_aceptar");
    const { iniciarActividad } = await import("@/lib/actividades-servicio");
    const agenda = await iniciarActividad(x.actor("M1"), cuerpo.id);
    expect(agenda).toMatchObject({ ok: false, status: 403, code: "por_aceptar" });
    expect(await borrar("M1", cuerpo.id)).toBe(403);
  });

  it("puede corregir lo que escribió mientras espera", async () => {
    const { cuerpo } = await avisar("M1");
    const r = await cambiar("M1", cuerpo.id, { description: "Está apagada desde ayer en la noche" });
    expect(r.estado).toBe(200);
  });

  it("su compañero capturista lo ve pero no lo toca; otro brigadista de la brigada ni lo ve", async () => {
    const { cuerpo } = await avisar("M1");
    expect((await cambiar("K1", cuerpo.id, { status: "active" })).estado).toBe(403);
    expect((await cambiar("M2", cuerpo.id, { status: "active" })).estado).toBe(404);
  });

  it("otra brigada, otra dirección y otro municipio: no existe", async () => {
    const { cuerpo } = await avisar("M1");
    for (const p of ["L2", "DB", "AZ"] as const) expect((await cambiar(p, cuerpo.id, { status: "active" })).estado, p).toBe(404);
  });

  it("su líder lo acepta y se lo puede asignar; ya asignado, quien avisó lo trabaja", async () => {
    const { cuerpo } = await avisar("M1");
    expect((await cambiar("L1", cuerpo.id, { status: "active" })).estado).toBe(200);
    expect((await cambiar("L1", cuerpo.id, { assignedToUserId: x.u.M1 })).estado).toBe(200);
    expect((await cambiar("M1", cuerpo.id, { status: "in_progress" })).estado).toBe(200);
  });

  it("la dirección, la administración del municipio y el maestro también lo aceptan", async () => {
    for (const p of ["D", "AT", "MA"] as const) {
      const { cuerpo } = await avisar("M1");
      expect((await cambiar(p, cuerpo.id, { status: "active" })).estado, p).toBe(200);
    }
  });
});

describe("retirar un aviso", () => {
  it("quien avisó lo retira: queda rechazado con el motivo, no se borra, y ya no lo reabre", async () => {
    const { cuerpo } = await avisar("M1");
    expect((await cambiar("M1", cuerpo.id, { status: "rechazada" })).estado).toBe(200);
    const [fila] = await (await db())
      .select({ estado: schema.eventReports.status, motivo: schema.eventReports.cancelReason })
      .from(schema.eventReports)
      .where(eq(schema.eventReports.id, cuerpo.id));
    expect(fila).toEqual({ estado: "rechazada", motivo: "Lo retiró quien avisó." });
    const reabrir = await cambiar("M1", cuerpo.id, { status: "active" });
    expect(reabrir.estado).toBe(403);
    expect(reabrir.cuerpo.code).toBe("por_aceptar");
  });

  it("lo que rechaza su líder tampoco lo reabre quien avisó", async () => {
    const { cuerpo } = await avisar("M1");
    expect((await cambiar("L1", cuerpo.id, { status: "rechazada" })).estado).toBe(200);
    expect((await cambiar("M1", cuerpo.id, { status: "pendiente" })).estado).toBe(403);
  });
});

describe("el número junto a «Incidencias»", () => {
  it("cuenta lo que cada quien puede aceptar, igual que el filtro «Por aceptar» de la pantalla", async () => {
    const { consultarIncidencias, contarPorAceptar } = await import("@/lib/incidencias-consulta");
    const { leerFiltrosDeIncidencias } = await import("@/lib/incidencias-filtros");
    const { resolveUserNetworkScope } = await import("@/lib/network-hierarchy");
    const antes = await contarPorAceptar(await resolveUserNetworkScope(x.u.L1));
    await avisar("M1");
    const alcanceL1 = await resolveUserNetworkScope(x.u.L1);
    expect(await contarPorAceptar(alcanceL1)).toBe(antes + 1);
    expect(await contarPorAceptar(alcanceL1)).toBe((await consultarIncidencias(alcanceL1, leerFiltrosDeIncidencias({}))).indicadores.porAceptar);
    expect(await contarPorAceptar(await resolveUserNetworkScope(x.u.L2))).toBe(0);
  });
});
