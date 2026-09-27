import { describe, expect, it } from "vitest";

import { getNavSection, itemsDeBarraMovil, LUGARES_EN_BARRA_MOVIL, SECCIONES_DEL_MENU } from "./role-home.js";

/**
 * La barra de abajo del teléfono, con el menú real: lo que cada rol puede abrir, filtrado igual
 * que en AppShell.
 */
const SECCIONES = SECCIONES_DEL_MENU.map((s) => s.clave);
const menuDe = (rol: string) =>
  SECCIONES.flatMap((s) => getNavSection(s)).filter((i) => i.allowedRoles.includes(rol));
const barra = (rol: string) => itemsDeBarraMovil(rol, menuDe(rol)).map((i) => i.key);

const ROLES = ["admin", "direction", "territorial_coordinator", "capturist", "visit_responsible"];

describe("barra de abajo del teléfono", () => {
  it.each(ROLES)("%s: Mapa y Agenda van primero", (rol) => {
    // Antes, a Administración, Dirección y Líder les salían Resumen, Análisis, Directorio y Registrar.
    expect(barra(rol).slice(0, 2)).toEqual(["mapa", "equipo"]);
  });

  it.each(ROLES)("%s: cuatro entradas, todas permitidas, sin repetir, sin Perfil ni Ajustes", (rol) => {
    const claves = barra(rol);
    const permitidas = new Set(menuDe(rol).map((i) => i.key));
    expect(claves).toHaveLength(LUGARES_EN_BARRA_MOVIL);
    expect(new Set(claves).size).toBe(claves.length);
    for (const clave of claves) expect(permitidas.has(clave)).toBe(true);
    expect(claves).not.toContain("perfil");
    expect(claves).not.toContain("settings");
  });

  it("el brigadista tiene Escucha Social a mano, que es lo que sí levanta en campo", () => {
    expect(barra("visit_responsible")).toContain("escucha-social");
  });

  it("si una entrada de la lista no le está permitida, se completa con las siguientes del menú", () => {
    const menu = [{ key: "crm" }, { key: "perfil" }, { key: "mapa" }, { key: "analytics" }, { key: "escucha-social" }];
    // Sin "equipo" ni "resumen" en lo permitido: quedan mapa y crm de su lista, y el resto del menú.
    expect(itemsDeBarraMovil("admin", menu).map((i) => i.key)).toEqual(["mapa", "crm", "analytics", "escucha-social"]);
  });

  it("un rol sin lista usa el orden del menú", () => {
    const menu = [{ key: "a" }, { key: "b" }, { key: "settings" }, { key: "c" }, { key: "d" }, { key: "e" }];
    expect(itemsDeBarraMovil("rol-nuevo", menu).map((i) => i.key)).toEqual(["a", "b", "c", "d"]);
  });
});
