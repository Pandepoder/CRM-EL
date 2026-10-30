import fs from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { getNavSection, puedeAbrir, rolesDeAcceso, ROLES_DEL_SISTEMA, SECCIONES_DEL_MENU } from "@tonala/ui";

import {
  anotarUltimaPantalla,
  ESTADOS_DE_PROBLEMA,
  guardarContextoDelReporte,
  hayRespuestaNueva,
  leerContextoDelReporte,
  leerUltimaPantalla,
  lugarDesdeRuta,
  lugaresParaReportar,
  puedeVerReporte,
  rutaParaReportar,
  TIPOS_DE_PROBLEMA,
  validarReporte
} from "./problemas";

/**
 * «Reportar un problema» (§9 del plan): cada quien solo puede señalar pantallas que abre, el formulario
 * llega con la pantalla de donde se vino, lo que se guarda está acotado, y la lista de tipos y estados es la
 * misma que acepta la base.
 */

const MIGRACION = fs.readFileSync("db/migrations/0027_reportes_de_problemas.sql", "utf8");
const valoresDelCheck = (nombre: string) =>
  [...(MIGRACION.match(new RegExp(`"${nombre}" CHECK \\("\\w+" IN \\(([^)]*)\\)\\)`))?.[1] ?? "").matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();

describe("dónde puede reportar cada quien", () => {
  it("las pantallas son exactamente las de su menú, y todas las abre", () => {
    for (const rol of ROLES_DEL_SISTEMA) {
      const pantallas = lugaresParaReportar(rol).filter((l) => l.grupo === "pantalla").map((l) => l.clave).sort();
      const menu = SECCIONES_DEL_MENU.flatMap(({ clave }) => getNavSection(clave))
        .filter((i) => i.allowedRoles.some((r) => rolesDeAcceso(rol, false).includes(r)))
        .map((i) => i.href)
        .sort();
      expect(pantallas, rol).toEqual(menu);
      for (const p of pantallas) expect(puedeAbrir(p as Parameters<typeof puedeAbrir>[0], rol), `${rol} ${p}`).toBe(true);
      expect(pantallas, rol).toContain("/reportar-problema");
    }
  });

  it("el brigadista no puede señalar pantallas de administración ni el Resumen", () => {
    const claves = lugaresParaReportar("visit_responsible").map((l) => l.clave);
    for (const ajena of ["/admin-usuarios", "/resumen", "/problemas-reportados", "/auditoria", "/crm/nuevo"]) expect(claves).not.toContain(ajena);
    expect(claves).toEqual(expect.arrayContaining(["/equipo", "/crm/contacts", "funcion:resultado", "funcion:ficha-ciudadano", "funcion:sin-senal", "funcion:otro"]));
  });

  it("administración puede señalar «Problemas reportados»; el maestro, además sus pantallas", () => {
    expect(lugaresParaReportar("admin").map((l) => l.clave)).toContain("/problemas-reportados");
    expect(lugaresParaReportar("admin").map((l) => l.clave)).not.toContain("/auditoria");
    expect(lugaresParaReportar("admin", true).map((l) => l.clave)).toContain("/auditoria");
  });

  it("ninguna clave ni nombre se repite en la lista de nadie", () => {
    for (const rol of ROLES_DEL_SISTEMA) {
      const lugares = lugaresParaReportar(rol);
      expect(new Set(lugares.map((l) => l.clave)).size, rol).toBe(lugares.length);
      expect(new Set(lugares.map((l) => l.etiqueta)).size, rol).toBe(lugares.length);
    }
  });
});

describe("la pantalla de donde se viene queda elegida", () => {
  const lider = lugaresParaReportar("territorial_coordinator");
  const brigadista = lugaresParaReportar("visit_responsible");

  it("la entrada del menú que gobierna la ruta, sin parámetros", () => {
    expect(lugarDesdeRuta("/equipo?actividad=123", lider)).toBe("/equipo");
    expect(lugarDesdeRuta("/crm/contacts", lider)).toBe("/crm/contacts");
    expect(lugarDesdeRuta("/crm/nuevo", lider)).toBe("/crm/nuevo");
    expect(lugarDesdeRuta("/mapa/", lider)).toBe("/mapa");
  });

  it("la ficha de un ciudadano es su función; el alta y el historial de incidencias, Incidencias", () => {
    expect(lugarDesdeRuta("/crm/contacts/9b0c2c1e-0000-4000-8000-000000000000", lider)).toBe("funcion:ficha-ciudadano");
    expect(lugarDesdeRuta("/reportes", lider)).toBe("/admin-incidencias");
    expect(lugarDesdeRuta("/historial-incidencias/x", lider)).toBe("/admin-incidencias");
  });

  it("nada elegido si la pantalla no es de las que puede señalar", () => {
    expect(lugarDesdeRuta("/admin-usuarios", brigadista)).toBeNull();
    expect(lugarDesdeRuta("/reportes", brigadista)).toBeNull();
    expect(lugarDesdeRuta(null, brigadista)).toBeNull();
    expect(lugarDesdeRuta("equipo", brigadista)).toBeNull();
    expect(lugarDesdeRuta("https://otro.sitio/equipo", brigadista)).toBeNull();
  });
});

describe("validar lo que llega", () => {
  const lugares = lugaresParaReportar("visit_responsible");
  const base = { lugar: "/equipo", tipo: "falla", descripcion: "Toqué Guardar y no hizo nada." };

  it("un reporte bien hecho pasa, con el nombre del lugar", () => {
    const v = validarReporte(base, lugares);
    expect(v).toMatchObject({ ok: true, entrada: { lugar: "/equipo", lugarEtiqueta: "Agenda", tipo: "falla", foto: null, ruta: null, error: null, dispositivo: null } });
  });

  it("dice qué campo corregir", () => {
    expect(validarReporte({ ...base, lugar: "" }, lugares)).toMatchObject({ ok: false, campo: "lugar" });
    expect(validarReporte({ ...base, lugar: "/admin-usuarios" }, lugares)).toMatchObject({ ok: false, campo: "lugar" });
    expect(validarReporte({ ...base, tipo: "otro" }, lugares)).toMatchObject({ ok: false, campo: "tipo" });
    expect(validarReporte({ ...base, descripcion: "  a " }, lugares)).toMatchObject({ ok: false, campo: "descripcion" });
    expect(validarReporte({ ...base, descripcion: "x".repeat(2001) }, lugares)).toMatchObject({ ok: false, campo: "descripcion" });
    expect(validarReporte({ ...base, foto: 12 }, lugares)).toMatchObject({ ok: false, campo: "foto" });
    expect(validarReporte(null, lugares)).toMatchObject({ ok: false, campo: "lugar" });
  });

  it("del contexto técnico guarda solo lo esperado, recortado", () => {
    const v = validarReporte(
      {
        ...base,
        ruta: "/equipo?actividad=1",
        error: "e".repeat(800),
        clientRequestId: "no-es-uuid",
        dispositivo: { navegador: "n".repeat(500), pantalla: "375x812", enLinea: false, idioma: "es-MX", contrasena: "secreta", extra: 1 },
        otraCosa: "no se guarda"
      },
      lugares
    );
    if (!v.ok) throw new Error("debía pasar");
    expect(v.entrada.ruta).toBe("/equipo?actividad=1");
    expect(v.entrada.error).toHaveLength(500);
    expect(v.entrada.clientRequestId).toBeNull();
    expect(v.entrada.dispositivo).toEqual({ navegador: "n".repeat(300), pantalla: "375x812", enLinea: false, idioma: "es-MX" });
    expect(JSON.stringify(v.entrada)).not.toMatch(/secreta|otraCosa|no se guarda/);
    const malo = validarReporte({ ...base, ruta: "https://otro.sitio", dispositivo: { pantalla: "<script>" } }, lugares);
    if (!malo.ok) throw new Error("debía pasar");
    expect(malo.entrada.ruta).toBeNull();
    expect(malo.entrada.dispositivo).toBeNull();
  });
});

describe("quién ve un reporte", () => {
  const alcance = (userId: string, extra: Partial<{ isAdmin: boolean; isMaster: boolean; allowedUserIds: string[] | null }> = {}) => ({
    userId,
    isAdmin: false,
    isMaster: false,
    allowedUserIds: [userId] as string[] | null,
    ...extra
  });

  it("quien lo hizo, siempre; nadie más que no sea administración", () => {
    expect(puedeVerReporte(alcance("ana"), "ana")).toBe(true);
    expect(puedeVerReporte(alcance("lider", { allowedUserIds: ["lider", "ana"] }), "ana")).toBe(false);
  });

  it("administración municipal, solo de su gente; el maestro, de todos", () => {
    expect(puedeVerReporte(alcance("at", { isAdmin: true, allowedUserIds: ["at", "ana"] }), "ana")).toBe(true);
    expect(puedeVerReporte(alcance("at", { isAdmin: true, allowedUserIds: ["at", "ana"] }), "beto")).toBe(false);
    expect(puedeVerReporte(alcance("m", { isAdmin: true, isMaster: true, allowedUserIds: null }), "beto")).toBe(true);
  });
});

describe("tipos y estados", () => {
  it("son exactamente los que acepta la base", () => {
    expect(TIPOS_DE_PROBLEMA.map((t) => t.clave).sort()).toEqual(valoresDelCheck("problem_reports_kind_check"));
    expect(Object.keys(ESTADOS_DE_PROBLEMA).sort()).toEqual(valoresDelCheck("problem_reports_status_check"));
  });

  it("cada tipo tiene botón y frases; cada estado, cómo se le dice a quien reportó", () => {
    for (const t of TIPOS_DE_PROBLEMA) {
      expect(t.emoji.length).toBeGreaterThan(0);
      expect(t.frases.length).toBeGreaterThanOrEqual(2);
    }
    for (const e of Object.values(ESTADOS_DE_PROBLEMA)) expect(e.paraQuienReporta.length).toBeGreaterThan(0);
  });
});

describe("del aviso de error al formulario", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function sesion() {
    const datos = new Map<string, string>();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (k: string) => datos.get(k) ?? null,
        setItem: (k: string, v: string) => void datos.set(k, v),
        removeItem: (k: string) => void datos.delete(k)
      }
    });
  }

  it("lleva la pantalla y el error una sola vez", () => {
    sesion();
    guardarContextoDelReporte({ ruta: "/equipo", error: "No se pudo guardar." });
    expect(leerContextoDelReporte()).toEqual({ ruta: "/equipo", error: "No se pudo guardar." });
    expect(leerContextoDelReporte()).toBeNull();
  });

  it("después de 10 minutos ya no cuenta", () => {
    sesion();
    vi.useFakeTimers({ now: new Date("2026-10-07T12:00:00Z") });
    guardarContextoDelReporte({ ruta: "/mapa", error: null });
    vi.setSystemTime(new Date("2026-10-07T12:11:00Z"));
    expect(leerContextoDelReporte()).toBeNull();
  });

  it("sin almacenamiento no falla", () => {
    vi.stubGlobal("window", {});
    expect(() => guardarContextoDelReporte({ ruta: "/mapa", error: null })).not.toThrow();
    expect(leerContextoDelReporte()).toBeNull();
  });

  it("recuerda la última pantalla, pero no el propio formulario de reportes", () => {
    sesion();
    expect(leerUltimaPantalla()).toBeNull();
    anotarUltimaPantalla("/equipo");
    anotarUltimaPantalla("/crm/contacts/abc");
    anotarUltimaPantalla("/reportar-problema");
    anotarUltimaPantalla("/reportar-problema?desde=%2Fmapa");
    anotarUltimaPantalla("no-es-ruta");
    expect(leerUltimaPantalla()).toBe("/crm/contacts/abc");
    // Y desde el menú, el formulario la elige: la ficha de un ciudadano es su función.
    expect(lugarDesdeRuta(leerUltimaPantalla(), lugaresParaReportar("visit_responsible"))).toBe("funcion:ficha-ciudadano");
  });

  it("sin almacenamiento, la última pantalla no falla", () => {
    vi.stubGlobal("window", {});
    expect(() => anotarUltimaPantalla("/equipo")).not.toThrow();
    expect(leerUltimaPantalla()).toBeNull();
  });

  it("la dirección del formulario lleva solo la pantalla, sin parámetros", () => {
    expect(rutaParaReportar("/crm/contacts/abc?tab=notas#x")).toBe("/reportar-problema?desde=%2Fcrm%2Fcontacts%2Fabc");
  });
});

describe("respuesta nueva para quien reportó", () => {
  const lunes = new Date("2026-10-05T12:00:00Z");
  const martes = new Date("2026-10-06T12:00:00Z");
  const base = { createdByUserId: "ana", statusChangedByUserId: "admin", statusChangedAt: martes, reporterSeenAt: null as Date | null };

  it("hay respuesta nueva si administración cambió el estado y la persona no lo ha visto", () => {
    expect(hayRespuestaNueva(base)).toBe(true);
    expect(hayRespuestaNueva({ ...base, reporterSeenAt: lunes })).toBe(true);
  });

  it("no la hay si ya la vio, si nadie lo ha tocado o si lo cambió la misma persona", () => {
    expect(hayRespuestaNueva({ ...base, reporterSeenAt: martes })).toBe(false);
    expect(hayRespuestaNueva({ ...base, reporterSeenAt: new Date("2026-10-07T00:00:00Z") })).toBe(false);
    expect(hayRespuestaNueva({ ...base, statusChangedAt: null, statusChangedByUserId: null })).toBe(false);
    expect(hayRespuestaNueva({ ...base, statusChangedByUserId: "ana" })).toBe(false);
  });
});
