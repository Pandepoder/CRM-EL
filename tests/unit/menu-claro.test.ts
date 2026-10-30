import { describe, expect, it } from "vitest";

import { puedeAbrir, rolesDeAcceso, ROLES_DEL_SISTEMA } from "../../packages/ui/capacidades.js";
import {
  getNavSection,
  itemsDeBarraMovil,
  juntarSeccionesSueltas,
  LUGARES_EN_BARRA_MOVIL,
  SECCIONES_DEL_MENU,
  type NavItemConfig
} from "../../packages/ui/role-home.js";

/**
 * El menú que ve cada rol (plan de experiencia sencilla, L5, L14 y §4 decisión 1). `capacidades.test.ts`
 * comprueba que el menú y las guardas digan lo mismo; esta, que lo que se lee se entienda:
 * - a nadie le falta una pantalla que puede abrir, ni le sobra una que lo rebota;
 * - ningún nombre se repite (dos entradas con el mismo nombre no se distinguen);
 * - las áreas cuyo nombre ya usa la campaña llevan debajo qué son, en pocas palabras;
 * - la barra de abajo del teléfono lleva lo de campo de cada rol, Mapa y Agenda primero.
 */

const todas: NavItemConfig[] = SECCIONES_DEL_MENU.flatMap(({ clave }) => getNavSection(clave));
const menuDe = (rol: string, esMaestro = false) => todas.filter((i) => i.allowedRoles.some((r) => rolesDeAcceso(rol, esMaestro).includes(r)));

describe("menú claro por rol", () => {
  it("cada rol ve en el menú exactamente las pantallas que puede abrir", () => {
    for (const rol of ROLES_DEL_SISTEMA) {
      const enMenu = menuDe(rol).map((i) => i.href).sort();
      const abre = todas.filter((i) => puedeAbrir(i.href, rol)).map((i) => i.href).sort();
      expect(enMenu, rol).toEqual(abre);
    }
  });

  it("ningún nombre ni nombre corto se repite", () => {
    const nombres = todas.map((i) => i.label);
    expect(new Set(nombres).size).toBe(nombres.length);
    const cortos = todas.map((i) => i.corto);
    expect(new Set(cortos).size).toBe(cortos.length);
  });

  it("los nombres que ya usa la campaña llevan debajo qué son", () => {
    const conAyuda = Object.fromEntries(todas.filter((i) => i.ayuda).map((i) => [i.href, i.ayuda]));
    expect(conAyuda).toEqual({
      "/escucha-social": "Lo que piden los vecinos",
      "/estructura-electoral": "Representantes por sección",
      "/logistica": "Material y almacén",
      "/analytics": "El padrón en números",
      "/reportar-problema": "Algo falla o no se entiende"
    });
    for (const ayuda of Object.values(conAyuda)) expect(String(ayuda).length).toBeLessThanOrEqual(40);
  });

  it("«Todos los reportes» vive dentro de Incidencias y ya no se confunde con «Auditoría de cambios»", () => {
    // D2 del plan de auditoría de menús: es la vista «Todas» de Incidencias; su dirección vieja redirige.
    const etiquetas = todas.map((i) => i.label);
    expect(etiquetas).not.toContain("Todos los reportes");
    expect(etiquetas).not.toContain("Auditoría de Eventos");
    expect(etiquetas.filter((e) => e.startsWith("Auditoría"))).toEqual(["Auditoría de cambios"]);
  });

  // Lo que pinta el armazón (`AppShell`): las secciones del rol, con las sueltas juntas.
  const seccionesDe = (rol: string, esMaestro = false) =>
    juntarSeccionesSueltas(SECCIONES_DEL_MENU.map(({ clave, titulo }) => ({ clave, titulo, items: getNavSection(clave).filter((i) => menuDe(rol, esMaestro).includes(i)) })));

  it("ningún título del menú queda sobre una sola entrada, salvo «Mi cuenta y ajustes»", () => {
    for (const rol of ROLES_DEL_SISTEMA) {
      for (const s of seccionesDe(rol)) {
        if (s.items.length < 2 && s.clave !== "configuracion") expect.fail(`${rol}: la sección «${s.titulo}» tiene ${s.items.length} entrada(s)`);
      }
    }
  });

  it("juntar secciones no quita ni repite ninguna entrada, y «Mi cuenta y ajustes» va al final", () => {
    for (const [rol, maestro] of [...ROLES_DEL_SISTEMA.map((r) => [r, false] as const), ["admin", true] as const]) {
      const secciones = seccionesDe(rol, maestro);
      expect(secciones.flatMap((s) => s.items).map((i) => i.href).sort(), rol).toEqual(menuDe(rol, maestro).map((i) => i.href).sort());
      expect(secciones[secciones.length - 1]!.clave, rol).toBe("configuracion");
    }
    // El brigadista: su Escucha Social queda con el trabajo de campo, no bajo un título propio.
    expect(seccionesDe("visit_responsible").map((s) => [s.titulo, s.items.map((i) => i.label)])).toEqual([
      ["Trabajo de campo", ["Mapa", "Agenda", "Directorio", "Escucha Social y Gestiones"]],
      ["Mi cuenta y ajustes", ["Mi perfil", "Reportar un problema"]]
    ]);
  });

  it("todos tienen «Reportar un problema» en el menú; «Problemas reportados» solo administración", () => {
    for (const rol of ROLES_DEL_SISTEMA) {
      const hrefs = menuDe(rol).map((i) => i.href);
      expect(hrefs, rol).toContain("/reportar-problema");
      expect(hrefs.includes("/problemas-reportados"), rol).toBe(rol === "admin");
    }
  });

  it("la barra del teléfono: Mapa y Agenda primero, solo pantallas que el rol abre, y caben", () => {
    for (const rol of ROLES_DEL_SISTEMA) {
      const barra = itemsDeBarraMovil(rol, menuDe(rol));
      expect(barra.length, rol).toBeLessThanOrEqual(LUGARES_EN_BARRA_MOVIL);
      expect(barra.slice(0, 2).map((i) => i.key), rol).toEqual(["mapa", "equipo"]);
      for (const i of barra) expect(puedeAbrir(i.href, rol), `${rol} ${i.href}`).toBe(true);
      expect(barra.some((i) => i.key === "perfil"), rol).toBe(false);
    }
    // Quien registra tiene el alta a un toque; el brigadista, que no registra, su Escucha Social.
    expect(itemsDeBarraMovil("capturist", menuDe("capturist")).map((i) => i.key)).toContain("crm-nuevo");
    expect(itemsDeBarraMovil("visit_responsible", menuDe("visit_responsible")).map((i) => i.key)).toContain("escucha-social");
  });
});
