import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ACCIONES, GRUPOS_DE_ACCIONES } from "../../apps/web/src/lib/auditoria-acciones.js";

/**
 * La pantalla de auditoría (etapa 6) enseña cada acción con su nombre en claro. Esta prueba recorre el
 * código y falla si alguna acción que se escribe en `audit_logs` no lo tiene: saldría como una clave
 * técnica («visits.completed») a quien revisa quién hizo qué.
 */

const RAICES = ["apps/web/app", "apps/web/src", "packages/modules", "packages/shared", "scripts/db"];

function archivos(dir: string): string[] {
  const salida: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) salida.push(...archivos(ruta));
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) salida.push(ruta);
  }
  return salida;
}

describe("acciones de la auditoría", () => {
  it("toda acción que el código escribe tiene nombre en claro", () => {
    const escritas = new Set<string>();
    for (const archivo of RAICES.flatMap((r) => archivos(path.resolve(r)))) {
      const texto = fs.readFileSync(archivo, "utf8");
      for (const m of texto.matchAll(/\baction:\s*"([a-z_]+(?:\.[a-z_]+)+)"/g)) escritas.add(m[1]!);
      // Las que pasan por un ayudante: `auditar(tx, actor, "…")` y `auditarDesdeLaConsola(cliente, "…")`.
      for (const m of texto.matchAll(/auditar(?:DesdeLaConsola)?\(\s*\w+,\s*(?:\w+,\s*)?"([a-z_.]+)"/g)) escritas.add(m[1]!);
      // Y las que se eligen con un ternario: `activa ? "user.activate" : "user.deactivate"`.
      for (const m of texto.matchAll(/\?\s*"((?:user|admin|agenda)\.[a-z_.]+)"\s*:\s*"((?:user|admin|agenda)\.[a-z_.]+)"/g)) {
        escritas.add(m[1]!);
        escritas.add(m[2]!);
      }
    }
    expect(escritas.size).toBeGreaterThanOrEqual(30);
    expect([...escritas].filter((a) => !(a in ACCIONES)).sort()).toEqual([]);
  });

  it("cada grupo del filtro recoge alguna acción con nombre", () => {
    for (const grupo of GRUPOS_DE_ACCIONES) {
      const recoge = Object.keys(ACCIONES).some((a) => grupo.prefijos.some((p) => (p.endsWith(".") ? a.startsWith(p) : a === p)));
      expect(recoge, grupo.clave).toBe(true);
    }
  });
});
