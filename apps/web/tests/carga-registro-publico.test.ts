import "dotenv/config";

import crypto from "node:crypto";

import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { huellaDeTelefono, schema } from "@tonala/shared/database";

import { getDatabaseClient } from "@/lib/db-client";

import { POST as registroPublico } from "../app/api/public/registro/route";
import { crearBaseDesechable } from "./base-desechable";

/**
 * Prueba de carga del registro público en un evento (3.5 del plan, C2).
 *
 * Con el padrón lleno —50 000 ciudadanos— y personas registrándose a la vez. Antes de la etapa 1
 * cada alta leía y descifraba el padrón entero: 50 a la vez con 3 385 ciudadanos esperaban 2,5 s
 * cada una, y la espera crecía con el padrón. Si alguien vuelve a meter un recorrido de la tabla en
 * este camino, esta prueba falla y con ella la compilación en CI (`pnpm validate`).
 *
 * Todas las peticiones salen de la MISMA IP y el mismo enlace: es lo que pasa con la WiFi de un
 * salón o detrás de la IP compartida de la compañía telefónica. Con el límite de antes (60 por hora),
 * la persona 61 recibía «demasiados intentos» (R25).
 *
 * Se llama al manejador de la ruta directamente, sin servidor HTTP: se mide el trabajo propio del
 * registro (consultas, cifrado, transacción) con el pool real de la aplicación (10 conexiones por
 * omisión, como en producción).
 *
 * Medido en desarrollo (2026-09-23): una sola, 10 ms; 50 a la vez, p95 137 ms; 100 a la vez, p95
 * 206 ms. Los umbrales son los criterios de aceptación de la etapa 1 y quedan muy por encima, para
 * que la prueba falle por una regresión de forma y no por una máquina lenta. Comprobado que falla:
 * con el escaneo del padrón de antes, una sola tardó 446 ms y 50 a la vez p95 9,2 s, con errores 500
 * al agotarse el pool; con el límite de 60 por hora, las de la segunda tanda recibieron 429.
 */

const PADRON = 50_000;
const UMBRAL_UNA_MS = 300; // criterio de aceptación de la etapa 1
const UMBRAL_P95_50_MS = 1_000; // criterio de aceptación de la etapa 1
const UMBRAL_P95_100_MS = 2_000;

const SLUG = `zz-carga-${Date.now()}`;
const dueno = crypto.randomUUID();
let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let siguiente = 0;

function persona() {
  siguiente++;
  return {
    slug: SLUG,
    firstName: `zz-carga-${siguiente}`,
    lastName: "Evento",
    // Teléfonos únicos y fuera del rango de los de relleno.
    phone: `55${String(10_000_000 + siguiente).padStart(8, "0")}`,
    birthDay: 1 + (siguiente % 28),
    birthMonth: 1 + (siguiente % 12),
    municipality: "Tonalá",
    colony: "zz-Colonia de carga",
    clientRequestId: crypto.randomUUID()
  };
}

async function registrar() {
  const inicio = performance.now();
  const r = await registroPublico(
    new NextRequest("http://localhost/api/public/registro", {
      method: "POST",
      // La misma IP para todos: la WiFi del salón.
      headers: { "content-type": "application/json", "x-forwarded-for": "200.1.2.3" },
      body: JSON.stringify(persona())
    })
  );
  return { status: r.status, ms: performance.now() - inicio };
}

function percentil(valores: number[], p: number) {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.min(orden.length - 1, Math.ceil((p / 100) * orden.length) - 1)]!;
}

async function aLaVez(n: number) {
  const r = await Promise.all(Array.from({ length: n }, () => registrar()));
  const ms = r.map((x) => x.ms);
  // Queda en la salida de CI: si un día sube sin llegar al umbral, se ve la tendencia.
  process.stdout.write(`[carga] ${n} a la vez: p50 ${Math.round(percentil(ms, 50))} ms, p95 ${Math.round(percentil(ms, 95))} ms, estados ${[...new Set(r.map((x) => x.status))].join(",")}\n`);
  return { estados: r.map((x) => x.status), p50: percentil(r.map((x) => x.ms), 50), p95: percentil(r.map((x) => x.ms), 95) };
}

beforeAll(async () => {
  base = await crearBaseDesechable("carga");
  const db = getDatabaseClient();
  const [rol] = await db.select({ id: schema.roles.id }).from(schema.roles).where(sql`${schema.roles.key} = 'territorial_coordinator'`);
  await db.insert(schema.userProfiles).values({
    id: dueno, email: `${SLUG}@prueba.local`, displayName: "zz-carga", roleId: rol!.id, status: "active", personalSlug: SLUG
  });
  // El padrón, como en producción: teléfono cifrado y su huella, que es lo que deja `pnpm db:migrate`.
  // Con teléfonos vacíos, volver a leer y descifrar la tabla entera costaría casi nada y la prueba
  // no lo notaría.
  const ahora = new Date();
  for (let desde = 0; desde < PADRON; desde += 2_000) {
    await db.insert(schema.contacts).values(
      Array.from({ length: Math.min(2_000, PADRON - desde) }, (_, i) => {
        const telefono = `33${String(desde + i).padStart(8, "0")}`;
        return {
          id: crypto.randomUUID(), displayName: `zz-padron-${desde + i}`, status: "active", createdByUserId: dueno,
          createdAt: ahora, version: 1, phone: telefono, phoneHash: huellaDeTelefono(telefono)
        };
      })
    );
  }
  await db.execute(sql`ANALYZE contacts`);
  // Calentamiento: abre conexiones del pool y compila lo que haga falta antes de medir.
  for (let i = 0; i < 3; i++) await registrar();
}, 300_000);

afterAll(async () => {
  await base?.borrar();
});

describe(`registro público con ${PADRON.toLocaleString("es-MX")} ciudadanos en el padrón`, () => {
  it("el duplicado se busca por índice, no recorriendo el padrón", async () => {
    const plan = await getDatabaseClient().execute<{ "QUERY PLAN": unknown }>(
      sql`EXPLAIN (FORMAT JSON) SELECT id FROM contacts WHERE phone_hash = ${"x".repeat(32)} LIMIT 1`
    );
    const texto = JSON.stringify(plan.rows);
    expect(texto).toMatch(/Index/);
    expect(texto).not.toMatch(/"Seq Scan"/);
  });

  it(`un alta sola responde en menos de ${UMBRAL_UNA_MS} ms`, async () => {
    const tiempos: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await registrar();
      expect(r.status).toBe(200);
      tiempos.push(r.ms);
    }
    process.stdout.write(`[carga] una sola: p50 ${Math.round(percentil(tiempos, 50))} ms\n`);
    expect(percentil(tiempos, 50)).toBeLessThan(UMBRAL_UNA_MS);
  });

  it(`50 a la vez, desde la misma red: todas entran y el p95 queda bajo ${UMBRAL_P95_50_MS} ms`, async () => {
    const r = await aLaVez(50);
    expect(r.estados.every((s) => s === 200)).toBe(true);
    expect(r.p95).toBeLessThan(UMBRAL_P95_50_MS);
  }, 60_000);

  it(`100 a la vez, desde la misma red: todas entran y el p95 queda bajo ${UMBRAL_P95_100_MS} ms`, async () => {
    const r = await aLaVez(100);
    expect(r.estados.every((s) => s === 200)).toBe(true);
    expect(r.p95).toBeLessThan(UMBRAL_P95_100_MS);
  }, 60_000);

  it("ninguna quedó duplicada ni perdida", async () => {
    const [fila] = (await getDatabaseClient().execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM contacts WHERE display_name LIKE 'zz-carga-%'`)).rows;
    expect(fila?.n).toBe(siguiente);
  });
});
