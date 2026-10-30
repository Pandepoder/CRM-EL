import "dotenv/config";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";

import { crearBaseDesechable } from "./base-desechable";
import { crearEstructuraDePrueba, type EstructuraDePrueba, type Persona } from "./estructura-de-prueba";

/**
 * La matriz de Escucha Social del plan de auditoría de menús (§4.3), contra la API y con las cuentas de
 * `estructura-de-prueba.ts`: quién ve qué en la lista y en el mapa, quién cambia el estado, quién turna, y
 * que la lista nunca ofrezca trabajar lo que el servidor después rechaza (ni al revés).
 */

const sesion: { actor: ActorContext | null } = { actor: null };
vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return { ...original, actorFromSession: async () => sesion.actor };
});

const consultaRuta = await import("../app/api/escucha-social/consulta/route");
const registro = await import("../app/api/escucha-social/[id]/route");
const mapa = await import("../app/api/map/escucha/route");

/** Quién anota una petición en la prueba. La de cada quien se llama por su autor. */
const AUTORES = ["AT", "D", "L1", "K1", "K2", "M1", "L2", "M3", "DB", "L4", "M4", "AZ", "L3", "M5"] as const;
type Autor = (typeof AUTORES)[number];
const de = {} as Record<Autor, string>;

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let x: EstructuraDePrueba;
const db = async () => (await import("@/lib/db-client")).getDatabaseClient();
const como = (p: Persona) => {
  sesion.actor = x.actor(p);
};
const nuestras = (ids: string[]) => ids.filter((i) => Object.values(de).includes(i));
const autoresDe = (ids: string[]) => nuestras(ids).map((i) => AUTORES.find((a) => de[a] === i)!).sort();

async function lista(p: Persona) {
  como(p);
  const filas: Array<{ id: string; puedeTrabajar: boolean }> = [];
  for (let pagina = 1; ; pagina++) {
    const r = await consultaRuta.POST(new Request("http://localhost/api/escucha-social/consulta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pagina }) }));
    expect(r.status, p).toBe(200);
    const cuerpo = await r.json();
    filas.push(...cuerpo.filas);
    if (pagina >= cuerpo.totalPaginas) break;
  }
  return filas.filter((f) => nuestras([f.id]).length === 1);
}

async function patch(p: Persona, id: string, cuerpo: Record<string, unknown>) {
  como(p);
  const r = await registro.PATCH(
    new Request(`http://localhost/api/escucha-social/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }),
    { params: Promise.resolve({ id }) }
  );
  return r.status;
}

beforeAll(async () => {
  base = await crearBaseDesechable("matriz_escucha");
  x = await crearEstructuraDePrueba(await db());
  const filas = await (await db())
    .insert(schema.socialListening)
    .values(
      AUTORES.map((a, i) => ({
        title: `zz De ${a}`,
        description: "Matriz de Escucha Social",
        categories: ["propuesta"],
        status: "pendiente",
        createdByUserId: x.u[a],
        latitude: 20.6 + i / 1000,
        longitude: -103.2
      }))
    )
    .returning({ id: schema.socialListening.id, autor: schema.socialListening.createdByUserId });
  for (const f of filas) de[AUTORES.find((a) => x.u[a] === f.autor)!] = f.id;
}, 120_000);

afterAll(async () => {
  await base?.borrar();
});

/** §4.3, «Ver peticiones en Escucha Social». */
const VE: Partial<Record<Persona, Autor[]>> = {
  MA: [...AUTORES],
  AT: ["AT", "D", "L1", "K1", "K2", "M1", "L2", "M3", "DB", "L4", "M4"],
  AZ: ["AZ", "L3", "M5"],
  D: ["D", "L1", "K1", "K2", "M1", "L2", "M3"],
  DB: ["DB", "L4", "M4"],
  L1: ["L1", "K1", "K2", "M1"],
  L2: ["L2", "M3"],
  // El capturista: las suyas y 👁 las de sus compañeros (con su líder).
  K1: ["L1", "K1", "K2", "M1"],
  // El brigadista: solo las suyas.
  M1: ["M1"],
  M3: ["M3"],
  L3: ["L3", "M5"],
  M5: ["M5"]
};

/** §4.3, «Cambiar estado y notas». */
const TRABAJA: Partial<Record<Persona, Autor[]>> = {
  MA: [...AUTORES],
  AT: ["AT", "D", "L1", "K1", "K2", "M1", "L2", "M3", "DB", "L4", "M4"],
  D: ["D", "L1", "K1", "K2", "M1", "L2", "M3"],
  L1: ["L1", "K1", "K2", "M1"],
  K1: ["K1"],
  M1: ["M1"],
  AZ: ["AZ", "L3", "M5"]
};

describe("quién ve qué (§4.3)", () => {
  it("cada perfil ve en la lista exactamente lo de su alcance", async () => {
    for (const [p, autores] of Object.entries(VE) as Array<[Persona, Autor[]]>) {
      expect(autoresDe((await lista(p)).map((f) => f.id)), p).toEqual([...autores].sort());
    }
  });

  it("la capa del mapa enseña lo mismo que la lista, sin un dato de más", async () => {
    for (const p of Object.keys(VE) as Persona[]) {
      como(p);
      const { puntos } = await (await mapa.GET()).json();
      expect(autoresDe(puntos.map((q: { id: string }) => q.id)), p).toEqual([...VE[p]!].sort());
      for (const q of puntos) expect(Object.keys(q).sort()).toEqual(["categoria", "estado", "id", "latitud", "longitud"]);
    }
  });
});

describe("quién cambia el estado (§4.3, ver no es trabajar)", () => {
  it("lo que ve y trabaja: 200; lo que solo ve: 403; lo que no ve: 404", async () => {
    for (const [p, trabaja] of Object.entries(TRABAJA) as Array<[Persona, Autor[]]>) {
      for (const a of AUTORES) {
        const esperado = trabaja.includes(a) ? 200 : VE[p]!.includes(a) ? 403 : 404;
        expect(await patch(p, de[a], { resolutionNotes: `zz nota de ${p}` }), `${p} sobre la de ${a}`).toBe(esperado);
      }
    }
  });

  it("para cada perfil y cada petición que ve, «puedeTrabajar» de la lista es lo que el servidor deja", async () => {
    for (const p of Object.keys(TRABAJA) as Persona[]) {
      for (const f of await lista(p)) {
        const esperado = f.puedeTrabajar ? 200 : 403;
        expect(await patch(p, f.id, { resolutionNotes: "zz coherencia" }), `${p} · ${autoresDe([f.id])[0]}`).toBe(esperado);
      }
    }
  });
});

describe("quién turna a una dependencia (§4.3, D6)", () => {
  it("solo administración, sobre lo que ve; el resto, 403 aunque sea suya", async () => {
    const turno = { turno: { dependencia: "SIAPA", folio: "zz-1" } };
    expect(await patch("MA", de.L3, turno)).toBe(200);
    expect(await patch("AT", de.K1, turno)).toBe(200);
    expect(await patch("AZ", de.M5, turno)).toBe(200);
    expect(await patch("AT", de.L3, turno)).toBe(404);
    expect(await patch("AZ", de.K1, turno)).toBe(404);
    for (const p of ["D", "L1", "K1", "M1"] as const) expect(await patch(p, de[p], turno), p).toBe(403);
  });
});
