import "dotenv/config";

import crypto from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { schema } from "@tonala/shared/database";

import { crearBaseDesechable } from "./base-desechable";

/**
 * «Hoy» en el Resumen es el día de Jalisco, aunque el servidor corra en UTC (el contenedor de
 * producción): antes los contadores de hoy volvían a cero a las 18:00. Contra una base desechable.
 *
 * Con la zona del equipo de desarrollo (la de Jalisco) el cálculo anterior también daba bien; la
 * diferencia se ve con el proceso en UTC, como en el contenedor y en CI:
 *   TZ=UTC npx vitest run apps/web/tests/resumen-hoy.test.ts
 */

const id = () => crypto.randomUUID();
const lider = id();
let base: Awaited<ReturnType<typeof crearBaseDesechable>>;

beforeAll(async () => {
  base = await crearBaseDesechable("resumen_hoy");
  const { getDatabaseClient } = await import("@/lib/db-client");
  const db = getDatabaseClient();
  const roles = Object.fromEntries((await db.select({ id: schema.roles.id, key: schema.roles.key }).from(schema.roles)).map((r) => [r.key, r.id]));
  await db.insert(schema.userProfiles).values({ id: lider, email: "zz-lider-hoy@prueba.local", displayName: "zz-lider-hoy", roleId: roles.territorial_coordinator!, status: "active", municipality: "Tonalá" });
  const ciudadano = (nombre: string, creado: string) => ({ id: id(), displayName: nombre, status: "active", createdByUserId: lider, createdAt: new Date(creado), version: 1 });
  await db.insert(schema.contacts).values([
    ciudadano("zz-ayer-tarde", "2026-09-26T00:30:00Z"), // 25 de septiembre, 18:30 en Jalisco
    ciudadano("zz-ayer-noche", "2026-09-26T05:59:00Z"), // 25 de septiembre, 23:59 en Jalisco
    ciudadano("zz-hoy-madrugada", "2026-09-26T06:30:00Z") // 26 de septiembre, 00:30 en Jalisco
  ]);
}, 180_000);

afterAll(async () => {
  await base?.borrar();
});

describe("Resumen: los contadores de hoy", () => {
  it("a las 19:00 de Jalisco, hoy es el día de Jalisco y no el de UTC", async () => {
    const { kpisDelResumen } = await import("@/lib/resumen-kpis");
    const { resolveUserNetworkScope } = await import("@/lib/network-hierarchy");
    const alcance = await resolveUserNetworkScope(lider);
    // 26 de septiembre, 19:00 en Jalisco = 27 de septiembre, 01:00 UTC.
    const k = await kpisDelResumen(alcance, { ahora: new Date("2026-09-27T01:00:00Z") });
    expect(k.totalContacts).toBe(3);
    expect(k.todayContacts).toBe(1);
  });

  it("y a las 08:00 de Jalisco, lo de anoche es de ayer", async () => {
    const { kpisDelResumen } = await import("@/lib/resumen-kpis");
    const { resolveUserNetworkScope } = await import("@/lib/network-hierarchy");
    const alcance = await resolveUserNetworkScope(lider);
    // 26 de septiembre, 08:00 en Jalisco = 14:00 UTC.
    const k = await kpisDelResumen(alcance, { ahora: new Date("2026-09-26T14:00:00Z") });
    expect(k.todayContacts).toBe(1);
  });
});
