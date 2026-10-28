import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Ninguna pantalla del panel ofrece un botón o un campo que no hace nada.
 *
 * La auditoría del 2026-10-15 (docs/PLAN_AUDITORIA_MENUS.md, B1 y B4) encontró «Ajustes» entero de
 * adorno —idioma, alertas, 2FA y «Guardar cambios» sin efecto— y un buscador de Logística que no buscaba:
 * se veían terminados y no servían. Esta prueba lee cada `.tsx` de `app/(shell)` con el analizador de
 * TypeScript (con expresiones regulares, los `=>` y `>=` de los atributos cortaban la etiqueta y daban
 * falsos positivos) y falla si encuentra:
 *
 * - un `<button>` sin `onClick`, `onMouseDown`, `onPointerDown`, `type="submit"`, `formAction` ni
 *   propiedades que llegan de fuera (`{...props}`);
 * - un `<input>`, `<select>` o `<textarea>` sin `onChange`, `onInput`, `name`, `ref`, `defaultValue` con
 *   `name`, ni `value` de solo lectura.
 *
 * Las excepciones son lo que ya se sabe que es de adorno, con la fase del plan que lo quita. Cuando la fase
 * termina, la cuenta de esa excepción deja de cuadrar y esta prueba pide borrarla.
 */

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PANEL = path.join(raiz, "apps/web/app/(shell)");

/** Archivo (relativo a la raíz) → cuántos elementos de adorno tiene hoy, y qué fase del plan los quita. */
const EXCEPCIONES: Record<string, { cuantos: number; fase: string }> = {
  // Vacía desde la fase 7 (Ajustes se retiró). Si alguna vez hace falta una, con su fase y su cuenta.
};

const ACCIONES_DE_BOTON = new Set(["onClick", "onMouseDown", "onPointerDown", "formAction"]);
const EFECTOS_DE_CAMPO = new Set(["onChange", "onInput", "name", "ref"]);

type Hallazgo = { archivo: string; linea: number; etiqueta: string };

function archivosDelPanel(dir: string): string[] {
  const salida: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) salida.push(...archivosDelPanel(ruta));
    else if (e.name.endsWith(".tsx") && !e.name.includes(".test.")) salida.push(ruta);
  }
  return salida;
}

function atributos(nodo: ts.JsxOpeningLikeElement): { nombres: Set<string>; conPropsDeFuera: boolean; valor: (n: string) => string | null } {
  const nombres = new Set<string>();
  let conPropsDeFuera = false;
  const valores = new Map<string, string | null>();
  for (const a of nodo.attributes.properties) {
    if (ts.isJsxSpreadAttribute(a)) {
      conPropsDeFuera = true;
      continue;
    }
    const nombre = a.name.getText();
    nombres.add(nombre);
    const ini = a.initializer;
    if (!ini) valores.set(nombre, "true");
    else if (ts.isStringLiteral(ini)) valores.set(nombre, ini.text);
    else if (ts.isJsxExpression(ini) && ini.expression && ts.isStringLiteral(ini.expression)) valores.set(nombre, ini.expression.text);
    else valores.set(nombre, null);
  }
  return { nombres, conPropsDeFuera, valor: (n) => valores.get(n) ?? null };
}

function deAdorno(nodo: ts.JsxOpeningLikeElement): string | null {
  const etiqueta = nodo.tagName.getText();
  if (!["button", "input", "select", "textarea"].includes(etiqueta)) return null;
  const { nombres, conPropsDeFuera, valor } = atributos(nodo);
  if (conPropsDeFuera) return null;
  if (etiqueta === "button") {
    if ([...ACCIONES_DE_BOTON].some((n) => nombres.has(n))) return null;
    if (valor("type") === "submit") return null;
    return etiqueta;
  }
  if ([...EFECTOS_DE_CAMPO].some((n) => nombres.has(n))) return null;
  if (valor("type") === "hidden") return null;
  if (nombres.has("value") && (nombres.has("readOnly") || nombres.has("disabled"))) return null;
  return etiqueta;
}

function hallazgos(): Hallazgo[] {
  const salida: Hallazgo[] = [];
  for (const archivo of archivosDelPanel(PANEL)) {
    const codigo = fs.readFileSync(archivo, "utf8");
    const fuente = ts.createSourceFile(archivo, codigo, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visitar = (n: ts.Node) => {
      if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
        const etiqueta = deAdorno(n);
        if (etiqueta) {
          salida.push({
            archivo: path.relative(raiz, archivo).replace(/\\/g, "/"),
            linea: fuente.getLineAndCharacterOfPosition(n.getStart()).line + 1,
            etiqueta
          });
        }
      }
      ts.forEachChild(n, visitar);
    };
    visitar(fuente);
  }
  return salida;
}

describe("sin pantallas de adorno", () => {
  const todos = hallazgos();

  it("ningún botón ni campo del panel está de adorno, fuera de las excepciones conocidas", () => {
    const nuevos = todos.filter((h) => !EXCEPCIONES[h.archivo]).map((h) => `${h.archivo}:${h.linea} <${h.etiqueta}>`);
    expect(nuevos).toEqual([]);
  });

  it("cada excepción sigue siendo cierta: cuando su fase la arregla, se borra de la lista", () => {
    for (const [archivo, { cuantos, fase }] of Object.entries(EXCEPCIONES)) {
      const hay = todos.filter((h) => h.archivo === archivo).length;
      expect(hay, `${archivo}: se esperaban ${cuantos} (${fase}); si ya se arregló, quítalo de EXCEPCIONES`).toBe(cuantos);
    }
  });

  it("la guardia reconoce un botón de adorno y uno que sí hace algo", () => {
    const fuente = ts.createSourceFile(
      "x.tsx",
      `const a = <><button className="x">Guardar</button><button type="button" disabled={n >= 1} onClick={() => f()}>Ir</button><input type="checkbox" defaultChecked /><input value={v} onChange={(e) => s(e.target.value)} /></>;`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
    const encontrados: string[] = [];
    const visitar = (n: ts.Node) => {
      if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
        const e = deAdorno(n);
        if (e) encontrados.push(e);
      }
      ts.forEachChild(n, visitar);
    };
    visitar(fuente);
    expect(encontrados).toEqual(["button", "input"]);
  });
});
