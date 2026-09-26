import { readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import journal from "../../../../db/migrations/meta/_journal.json";

import { migracionesPendientes } from "./estado-del-sistema.js";

const MIGRACIONES = path.resolve(__dirname, "../../../../db/migrations");

describe("migraciones pendientes (la regla del migrador de Drizzle)", () => {
  const esperadas = [
    { tag: "0017_a", when: 1_000 },
    { tag: "0018_b", when: 2_000 },
    { tag: "0019_c", when: 3_000 }
  ];

  it("sin ninguna registrada, faltan todas", () => {
    expect(migracionesPendientes(esperadas, null)).toEqual(["0017_a", "0018_b", "0019_c"]);
  });

  it("con la última registrada, no falta ninguna", () => {
    expect(migracionesPendientes(esperadas, 3_000)).toEqual([]);
  });

  /** El caso de C1: la base iba dos migraciones por detrás del código. */
  it("con la base por detrás, faltan exactamente las posteriores", () => {
    expect(migracionesPendientes(esperadas, 1_000)).toEqual(["0018_b", "0019_c"]);
  });
});

/**
 * Las migraciones se escriben a mano (drizzle-kit ya no sirve en este repositorio, ver D6 en el
 * plan), así que el journal también se edita a mano. Hay dos errores que no dan ningún aviso:
 *
 *  - un `when` menor o igual que el de la migración anterior: el migrador compara con el último
 *    aplicado y la SALTA en las bases que ya existen, sin error;
 *  - un `.sql` sin su entrada en el journal: NUNCA se aplica.
 *
 * En los dos casos la base queda por detrás del código, que es exactamente lo que tumbó `/resumen`.
 */
describe("journal de migraciones", () => {
  it("cada `when` es estrictamente mayor que el anterior", () => {
    const cuando = journal.entries.map((m) => m.when);
    for (let i = 1; i < cuando.length; i++) {
      expect(cuando[i], `${journal.entries[i]!.tag} debe ir después de ${journal.entries[i - 1]!.tag}`).toBeGreaterThan(
        cuando[i - 1]!
      );
    }
  });

  it("los índices del journal son correlativos", () => {
    expect(journal.entries.map((m) => m.idx)).toEqual(journal.entries.map((_, i) => i));
  });

  it("cada entrada del journal tiene su archivo .sql, y cada .sql su entrada", () => {
    const archivos = readdirSync(MIGRACIONES)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => f.replace(/\.sql$/, ""))
      .sort();
    const registradas = journal.entries.map((m) => m.tag).sort();

    expect(archivos).toEqual(registradas);
  });
});
