import "dotenv/config";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type * as ClienteDb from "@/lib/db-client";
import type * as Equipos from "@/lib/equipos-de-persona";
import type * as Jerarquia from "@/lib/network-hierarchy";

import { crearBaseDesechable } from "./base-desechable";
import { crearEstructuraDePrueba, type EstructuraDePrueba, type Persona } from "./estructura-de-prueba";

/**
 * El perfil enseña los equipos reales de la persona (plan de auditoría de menús, F1.3). Antes, quien no
 * dirigía un equipo tenía uno inventado («Equipo de Raúl», con su id de persona), y «Ver su Equipo» llevaba
 * a un equipo que no existe.
 */

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let db: ReturnType<typeof ClienteDb.getDatabaseClient>;
let alcance: typeof Jerarquia.resolveUserNetworkScope;
let equiposDePersona: typeof Equipos.equiposDePersona;
let x: EstructuraDePrueba;

async function equiposDe(persona: Persona, mira: Persona) {
  const lista = await equiposDePersona(x.u[persona], await alcance(x.u[mira]));
  const nombreDeEquipo = Object.fromEntries(Object.entries(x.t).map(([k, v]) => [v, k]));
  return lista.map((e) => `${nombreDeEquipo[e.id] ?? "INVENTADO"}${e.lidera ? " (dirige)" : ""}${e.enlazable ? " →" : ""}`);
}

beforeAll(async () => {
  base = await crearBaseDesechable("perfil_equipo");
  db = (await import("@/lib/db-client")).getDatabaseClient();
  alcance = (await import("@/lib/network-hierarchy")).resolveUserNetworkScope;
  equiposDePersona = (await import("@/lib/equipos-de-persona")).equiposDePersona;
  x = await crearEstructuraDePrueba(db);
}, 120_000);

afterAll(async () => {
  await base?.borrar();
});

describe("los equipos del perfil", () => {
  it("un capturista ve su brigada real, sin enlace porque no abre «Equipos»", async () => {
    expect(await equiposDe("K1", "K1")).toEqual(["B1"]);
  });

  it("un líder dirige su brigada y es integrante de la coordinación; quien manda los abre", async () => {
    expect(await equiposDe("L1", "L1")).toEqual(["B1 (dirige) →", "C →"]);
    expect(await equiposDe("L1", "D")).toEqual(["B1 (dirige) →", "C →"]);
  });

  it("otra dirección ve los nombres pero no tiene enlace a equipos que no son suyos", async () => {
    expect(await equiposDe("L1", "DB")).toEqual(["B1 (dirige)", "C"]);
  });

  it("quien no está en ningún equipo no tiene uno inventado", async () => {
    expect(await equiposDe("AT", "AT")).toEqual([]);
    expect(await equiposDe("AT", "MA")).toEqual([]);
  });

  it("el maestro abre cualquier equipo", async () => {
    expect(await equiposDe("M5", "MA")).toEqual(["B3 →"]);
  });
});
