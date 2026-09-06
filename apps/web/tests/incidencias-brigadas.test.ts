import "dotenv/config";

import crypto from "node:crypto";

import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";

/**
 * Alta de incidencias y su reparto entre equipos y brigadas.
 *
 * Estos dos flujos no los cubria ninguna prueba, ni la suite ni el auditor de
 * campo: audit-e2e-field-scenarios.ts recorre registro, contactos, escucha
 * social, prospectos, jerarquia y geo, y se salta las incidencias por completo.
 *
 * Se ejercitan los manejadores HTTP de verdad, no una copia de su logica: solo
 * se sustituye la lectura de la sesion, porque depende de las cookies del
 * request. Todo lo demas —permisos, ambito de red, consulta de visibilidad,
 * outbox y persistencia— corre contra la base real.
 *
 * Lo que mas importa aqui es el aislamiento entre brigadas: una incidencia
 * asignada a un equipo lleva datos de un ciudadano y de una direccion, y no
 * debe verla la brigada de al lado.
 */

type ActorPrueba = { actorId: string; roles: string[] } | null;

const sesion: { actor: ActorPrueba } = { actor: null };

vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return {
    ...original,
    actorFromSession: async () => sesion.actor
  };
});

const { GET, POST } = await import("../app/api/map/reports/route");
const { getDatabaseClient } = await import("@/lib/db-client");

const db = getDatabaseClient();

const sufijo = crypto.randomUUID().slice(0, 8);
const ids = {
  liderA: crypto.randomUUID(),
  brigadistaA: crypto.randomUUID(),
  liderB: crypto.randomUUID(),
  brigadaA: crypto.randomUUID(),
  brigadaB: crypto.randomUUID()
};
const reportesCreados: string[] = [];
let adminId = "";

function actor(userId: string, roles: string[] = ["visit_responsible"]): ActorPrueba {
  return { actorId: userId, roles };
}

function peticion(cuerpo: Record<string, unknown>): Request {
  return new Request("http://localhost/api/map/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo)
  });
}

/** Coordenadas dentro de Tonalá, para que la deteccion de seccion tenga algo que resolver. */
const EN_TONALA = { latitude: 20.6248, longitude: -103.2422 };

async function crearIncidencia(
  quien: ActorPrueba,
  extra: Record<string, unknown> = {}
): Promise<{ estado: number; cuerpo: any }> {
  sesion.actor = quien;
  const respuesta = await POST(
    peticion({
      title: `Bache de prueba ${sufijo}`,
      description: "Creada por la suite de integracion",
      category: "bache",
      ...EN_TONALA,
      ...extra
    })
  );
  const cuerpo = await respuesta.json();
  if (cuerpo?.id) reportesCreados.push(cuerpo.id);
  return { estado: respuesta.status, cuerpo };
}

async function idsVisiblesPara(quien: ActorPrueba): Promise<string[]> {
  sesion.actor = quien;
  const respuesta = await GET(new Request("http://localhost/api/map/reports"));
  const geojson = await respuesta.json();
  return (geojson.features ?? []).map((f: any) => f.properties.id);
}

beforeAll(async () => {
  const [rolBrigadista] = await db
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(eq(schema.roles.key, "visit_responsible"))
    .limit(1);

  const [admin] = await db
    .select({ id: schema.userProfiles.id })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(eq(schema.roles.key, "admin"))
    .limit(1);

  if (!rolBrigadista || !admin) {
    throw new Error(
      "La base de pruebas no tiene el catalogo de roles ni un admin sembrado. Corre `pnpm db:seed` antes."
    );
  }
  adminId = admin.id;

  await db.insert(schema.userProfiles).values([
    { id: ids.liderA, email: `lider.a.${sufijo}@prueba.local`, displayName: "Lider Brigada A", roleId: rolBrigadista.id },
    { id: ids.brigadistaA, email: `brigadista.a.${sufijo}@prueba.local`, displayName: "Brigadista A", roleId: rolBrigadista.id },
    { id: ids.liderB, email: `lider.b.${sufijo}@prueba.local`, displayName: "Lider Brigada B", roleId: rolBrigadista.id }
  ]);

  await db.insert(schema.teams).values([
    { id: ids.brigadaA, name: `Brigada A ${sufijo}`, leaderId: ids.liderA },
    { id: ids.brigadaB, name: `Brigada B ${sufijo}`, leaderId: ids.liderB }
  ]);

  await db.insert(schema.teamMembers).values([{ teamId: ids.brigadaA, userId: ids.brigadistaA }]);
});

afterAll(async () => {
  const borrar = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch {
      /* la limpieza no debe tumbar la suite */
    }
  };

  if (reportesCreados.length > 0) {
    await borrar(() =>
      db.execute(
        sql`delete from transactional_outbox where aggregate_id in (${sql.join(
          reportesCreados.map((id) => sql`${id}`),
          sql`, `
        )})`
      )
    );
    await borrar(() => db.delete(schema.eventReports).where(inArray(schema.eventReports.id, reportesCreados)));
  }
  await borrar(() => db.delete(schema.teamMembers).where(inArray(schema.teamMembers.teamId, [ids.brigadaA, ids.brigadaB])));
  await borrar(() => db.delete(schema.teams).where(inArray(schema.teams.id, [ids.brigadaA, ids.brigadaB])));
  await borrar(() =>
    db.delete(schema.userProfiles).where(inArray(schema.userProfiles.id, [ids.liderA, ids.brigadistaA, ids.liderB]))
  );
});

describe("Alta de incidencias", () => {
  it("un brigadista sin brigada a su cargo no puede levantarlas", async () => {
    const { estado, cuerpo } = await crearIncidencia(actor(ids.brigadistaA));

    expect(estado).toBe(403);
    expect(cuerpo.code).toBe("forbidden_no_es_lider");
    // El mensaje dice que hacer, no solo que no se puede: quien se topa con
    // esto esta en la calle y necesita saber a quien reportarle.
    expect(cuerpo.message).toMatch(/líder/i);
  });

  it("el lider de una brigada si puede, y la incidencia queda pendiente de admision", async () => {
    const { estado, cuerpo } = await crearIncidencia(actor(ids.liderA));

    expect(estado).toBe(201);
    expect(cuerpo.status).toBe("pendiente");
    expect(cuerpo.createdByUserId).toBe(ids.liderA);
  });

  it("la que levanta administracion entra ya aceptada, sin admitirse a si misma", async () => {
    const { estado, cuerpo } = await crearIncidencia(actor(adminId, ["admin"]));

    expect(estado).toBe(201);
    expect(cuerpo.status).toBe("active");
  });

  it("rechaza una categoria fuera del catalogo antes de llegar a la base", async () => {
    const { estado, cuerpo } = await crearIncidencia(actor(adminId, ["admin"]), {
      category: "categoria-que-no-existe"
    });

    expect(estado).toBe(400);
    expect(cuerpo.error).toMatch(/no existe/i);
  });

  it("resuelve sola la seccion electoral y el municipio a partir de las coordenadas", async () => {
    const { cuerpo } = await crearIncidencia(actor(adminId, ["admin"]));

    expect(cuerpo.municipality).toBeTruthy();
    expect(cuerpo.latitude).toBeCloseTo(EN_TONALA.latitude, 4);
  });
});

describe("Reparto entre equipos y brigadas", () => {
  it("una incidencia asignada a una brigada no la ve la brigada de al lado", async () => {
    const { cuerpo } = await crearIncidencia(actor(adminId, ["admin"]), {
      assignedTeamId: ids.brigadaA,
      title: `Fuga asignada a A ${sufijo}`
    });
    const idAsignada = cuerpo.id as string;

    expect(await idsVisiblesPara(actor(ids.liderA))).toContain(idAsignada);
    expect(await idsVisiblesPara(actor(ids.brigadistaA))).toContain(idAsignada);

    expect(await idsVisiblesPara(actor(ids.liderB))).not.toContain(idAsignada);
  });

  it("una incidencia asignada a una persona la ven sus companeros de brigada, no la otra", async () => {
    const { cuerpo } = await crearIncidencia(actor(adminId, ["admin"]), {
      assignedToUserId: ids.brigadistaA,
      title: `Tarea con nombre y apellido ${sufijo}`
    });
    const idAsignada = cuerpo.id as string;

    expect(await idsVisiblesPara(actor(ids.brigadistaA))).toContain(idAsignada);
    expect(await idsVisiblesPara(actor(ids.liderA))).toContain(idAsignada);

    expect(await idsVisiblesPara(actor(ids.liderB))).not.toContain(idAsignada);
  });

  it("una incidencia sin asignar es informacion general y la ve toda la estructura", async () => {
    const { cuerpo } = await crearIncidencia(actor(adminId, ["admin"]), {
      title: `Sin asignar ${sufijo}`
    });
    const idLibre = cuerpo.id as string;

    expect(await idsVisiblesPara(actor(ids.liderA))).toContain(idLibre);
    expect(await idsVisiblesPara(actor(ids.liderB))).toContain(idLibre);
    expect(await idsVisiblesPara(actor(ids.brigadistaA))).toContain(idLibre);
  });

  it("administracion ve todo, asignado o no", async () => {
    const { cuerpo } = await crearIncidencia(actor(adminId, ["admin"]), {
      assignedTeamId: ids.brigadaB,
      title: `Asignada a B ${sufijo}`
    });

    expect(await idsVisiblesPara(actor(adminId, ["admin"]))).toContain(cuerpo.id);
  });

  it("quien la levanta la sigue viendo aunque se asigne a otra brigada", async () => {
    const { cuerpo } = await crearIncidencia(actor(ids.liderA), {
      assignedTeamId: ids.brigadaB,
      title: `Levantada por A, asignada a B ${sufijo}`
    });

    expect(await idsVisiblesPara(actor(ids.liderA))).toContain(cuerpo.id);
  });
});

describe("Consistencia del catalogo de estados", () => {
  it("la base acepta exactamente los estados del catalogo compartido", async () => {
    const { esEstadoValido, CLAVES_ESTADO } = await import("@/lib/estados-incidencia");

    const restriccion = await db.execute(sql`
      select pg_get_constraintdef(oid) as definicion
      from pg_constraint
      where conrelid = 'event_reports'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) like '%status%'
    `);
    const definicion = String((restriccion.rows[0] as any)?.definicion ?? "");

    // Los estados ya se desincronizaron una vez entre las pantallas y la base,
    // que es justo el motivo de que exista el catalogo. Esto lo detecta.
    for (const clave of CLAVES_ESTADO) {
      expect(esEstadoValido(clave)).toBe(true);
      expect(definicion).toContain(`'${clave}'`);
    }
  });
});
