import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  ACCESO_A_PANTALLAS,
  puedeAbrir,
  ROL_MAESTRO,
  rolesDeAcceso,
  rolesDePantalla,
  ROLES_DEL_SISTEMA,
  type PantallaDelPanel
} from "../../packages/ui/capacidades.js";
import { getHomePathForRole, getNavSection, SECCIONES_DEL_MENU } from "../../packages/ui/role-home.js";

/**
 * Menú, pantallas y guardas dicen lo mismo (M1, M9).
 *
 * `ACCESO_A_PANTALLAS` es la única lista de quién abre cada pantalla del panel. Esta prueba recorre
 * los archivos reales de `app/(shell)` y falla si:
 * - una pantalla se protege con otra guarda (`requirePageRole`/`requirePageSession` con su propia
 *   lista) o no se protege;
 * - una entrada del menú apunta a algo que no está en la lista o con otros roles;
 * - la pantalla de inicio de un rol no se la deja abrir (se quedaría rebotando).
 */

const RAIZ = path.resolve("apps/web/app/(shell)");
const PANTALLAS = Object.keys(ACCESO_A_PANTALLAS) as PantallaDelPanel[];

/** Rutas del panel sin pantalla propia en la lista, con el motivo. Cada una tiene que seguir siéndolo. */
const EXCEPCIONES: Record<string, string> = {
  "/inbox": "redirige a / y no enseña nada"
};

function archivos(dir: string, nombre: string): string[] {
  const salida: string[] = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...archivos(ruta, nombre));
    else if (entrada.name === nombre) salida.push(ruta);
  }
  return salida;
}

/** `/crm/contacts/[id]` a partir de la carpeta; los grupos `(x)` no cuentan en la URL. */
function rutaDe(carpeta: string): string {
  const partes = path.relative(RAIZ, carpeta).split(path.sep).filter((p) => p && !/^\(.*\)$/.test(p));
  return "/" + partes.join("/");
}

/** La pantalla de la lista que gobierna una ruta: ella misma o la más larga que la contiene. */
function pantallaQueGobierna(ruta: string): PantallaDelPanel | undefined {
  return PANTALLAS.filter((p) => ruta === p || ruta.startsWith(`${p}/`)).sort((a, b) => b.length - a.length)[0];
}

/** La página y los layouts de su carpeta hacia arriba, sin el layout raíz del panel. */
function guardasPosibles(archivoDePagina: string): string[] {
  const candidatos: string[] = [archivoDePagina];
  for (let dir = path.dirname(archivoDePagina); dir.startsWith(RAIZ) && dir !== RAIZ; dir = path.dirname(dir)) {
    const layout = path.join(dir, "layout.tsx");
    if (fs.existsSync(layout)) candidatos.push(layout);
  }
  return candidatos;
}

const accesosEn = (archivo: string) =>
  [...fs.readFileSync(archivo, "utf8").matchAll(/requirePageAccess\("([^"]+)"\)/g)].map((m) => m[1]);

describe("ACCESO_A_PANTALLAS gobierna el menú y las guardas", () => {
  it("cada pantalla de la lista existe", () => {
    const faltan = PANTALLAS.filter((p) => !fs.existsSync(path.join(RAIZ, ...p.split("/").filter(Boolean), "page.tsx")));
    expect(faltan).toEqual([]);
  });

  it("cada entrada del menú está en la lista, con los mismos roles", () => {
    for (const { clave } of SECCIONES_DEL_MENU) {
      for (const entrada of getNavSection(clave)) {
        expect(PANTALLAS, entrada.href).toContain(entrada.href);
        expect([...entrada.allowedRoles]).toEqual([...rolesDePantalla(entrada.href)]);
      }
    }
  });

  it.each([...ROLES_DEL_SISTEMA])("%s puede abrir su pantalla de inicio", (rol) => {
    const inicio = getHomePathForRole(rol) as PantallaDelPanel;
    expect(PANTALLAS).toContain(inicio);
    expect(puedeAbrir(inicio, rol)).toBe(true);
  });

  it("quien puede abrir el Resumen entra por él, y nadie más", () => {
    for (const rol of ROLES_DEL_SISTEMA) {
      expect(getHomePathForRole(rol) === "/resumen", rol).toBe(puedeAbrir("/resumen", rol));
    }
  });

  it("el middleware no lleva su propia lista de pantallas de inicio", () => {
    const middleware = fs.readFileSync(path.resolve(RAIZ, "../../middleware.ts"), "utf8");
    expect(middleware).toMatch(/import \{ getHomePathForRole \} from "@tonala\/ui\/role-home\.js"/);
    expect(middleware).not.toMatch(/function getHomePathForRole/);
    // El middleware corre en el runtime edge: lo que importa de @tonala/ui no puede traer React.
    // `scripts/check-module-boundaries.mjs` permite ese módulo por su ruta solo por eso.
    const importaciones = (archivo: string) =>
      [...fs.readFileSync(path.resolve("packages/ui", archivo), "utf8").matchAll(/^import .* from "([^"]+)";/gm)].map((m) => m[1]);
    expect(importaciones("role-home.ts")).toEqual(["./capacidades.js"]);
    expect(importaciones("capacidades.ts")).toEqual([]);
  });

  it("ninguna pantalla del panel se protege con una lista propia", () => {
    const conListaPropia = [...archivos(RAIZ, "page.tsx"), ...archivos(RAIZ, "layout.tsx")]
      .filter((a) => /requirePage(Role|Session)\(/.test(fs.readFileSync(a, "utf8")))
      .map((a) => path.relative(RAIZ, a));
    expect(conListaPropia).toEqual([]);
  });

  it("cada pantalla del panel pasa por la guarda de la pantalla que la gobierna", () => {
    const sinGuarda: string[] = [];
    for (const pagina of archivos(RAIZ, "page.tsx")) {
      const ruta = rutaDe(path.dirname(pagina));
      if (ruta in EXCEPCIONES) continue;
      const guardas = guardasPosibles(pagina).flatMap(accesosEn);
      const gobierna = pantallaQueGobierna(ruta);
      // Con pantalla en la lista, su guarda exacta. Sin ella (redirecciones viejas bajo /crm), al
      // menos la de un layout que la envuelve.
      const protegida = gobierna ? guardas.includes(gobierna) : guardas.length > 0;
      if (!protegida) sinGuarda.push(`${ruta} (esperaba requirePageAccess("${gobierna ?? "…"}"))`);
    }
    expect(sinGuarda).toEqual([]);
  });

  it("una página que pone su propia guarda usa la de su pantalla, no la de otra", () => {
    const equivocadas: string[] = [];
    for (const pagina of archivos(RAIZ, "page.tsx")) {
      const gobierna = pantallaQueGobierna(rutaDe(path.dirname(pagina)));
      for (const usada of accesosEn(pagina)) if (usada !== gobierna) equivocadas.push(`${path.relative(RAIZ, pagina)}: ${usada}`);
    }
    expect(equivocadas).toEqual([]);
  });

  it("las excepciones siguen sin enseñar nada", () => {
    for (const ruta of Object.keys(EXCEPCIONES)) {
      const texto = fs.readFileSync(path.join(RAIZ, ...ruta.split("/").filter(Boolean), "page.tsx"), "utf8");
      expect(texto, ruta).toMatch(/\bredirect\(/);
      expect(texto, ruta).not.toMatch(/return\s*\(/);
    }
  });
});

describe("pantallas del administrador maestro (etapa 6)", () => {
  /** Lo que gobierna todo el estado. Si una pantalla deja de estar aquí, que sea a propósito. */
  const DEL_MAESTRO: PantallaDelPanel[] = ["/administracion-municipal", "/sin-municipio", "/auditoria", "/settings"];

  it("solo las abre el maestro: ningún rol de la tabla, tampoco administración", () => {
    for (const pantalla of DEL_MAESTRO) {
      expect([...rolesDePantalla(pantalla)], pantalla).toEqual([ROL_MAESTRO]);
      for (const rol of ROLES_DEL_SISTEMA) expect(puedeAbrir(pantalla, rol), `${pantalla} · ${rol}`).toBe(false);
    }
  });

  it("el maestro abre todo lo que abre administración, y además lo suyo", () => {
    const roles = rolesDeAcceso("admin", true);
    for (const pantalla of PANTALLAS) {
      const abre = rolesDePantalla(pantalla).some((r) => roles.includes(r));
      if (puedeAbrir(pantalla, "admin") || DEL_MAESTRO.includes(pantalla)) expect(abre, pantalla).toBe(true);
    }
  });

  it("`master_admin` no es un rol de la tabla: es la marca de una cuenta de administración", () => {
    expect(ROLES_DEL_SISTEMA as readonly string[]).not.toContain(ROL_MAESTRO);
    expect(rolesDeAcceso("admin", false)).toEqual(["admin"]);
  });
});
