import { describe, expect, it } from "vitest";

import { PASOS, pasosDe, PIE_PARA_REPORTAR } from "../../apps/web/src/lib/primeros-pasos.js";
import { opcionesDelBotonMas } from "../../packages/ui/boton-mas.js";
import { puedeAbrir, ROLES_DEL_SISTEMA, type PantallaDelPanel } from "../../packages/ui/capacidades.js";
import { itemsDeBarraMovil, primaryNavItems } from "../../packages/ui/role-home.js";

/**
 * Los atajos que el sistema le ofrece a cada rol —la tarjeta «Primeros pasos» y el botón «+»— solo llevan a
 * pantallas que ese rol puede abrir. Un atajo a una pantalla que rebota es peor que no tenerlo: la persona
 * toca, vuelve a su inicio sin explicación y cree que el sistema falla (L2, L4 y C10 del plan).
 */

const ruta = (href: string) => href.split("?")[0] as PantallaDelPanel;

/** Palabras de los pasos que nombran una pantalla. */
const PANTALLA_NOMBRADA: Array<[RegExp, PantallaDelPanel]> = [
  [/\bAgenda\b/, "/equipo"],
  [/\bDirectorio\b/, "/crm/contacts"],
  [/\bResumen\b/, "/resumen"],
  [/\bAnálisis\b/, "/analytics"],
  [/\bEquipos\b/, "/admin-equipos"],
  [/\bUsuarios\b/, "/admin-usuarios"],
  [/\bEscucha Social\b/, "/escucha-social"]
];

describe("«Primeros pasos» por rol", () => {
  it("cada rol del sistema tiene sus cuatro pasos", () => {
    for (const rol of ROLES_DEL_SISTEMA) expect(pasosDe(rol)?.length, rol).toBe(4);
    expect(pasosDe("rol-inventado")).toBeNull();
    expect(Object.keys(PASOS).sort()).toEqual([...ROLES_DEL_SISTEMA].sort());
  });

  it("cada enlace de un paso abre para ese rol", () => {
    for (const rol of ROLES_DEL_SISTEMA) {
      for (const paso of pasosDe(rol) ?? []) {
        if (paso.enlace) expect(puedeAbrir(ruta(paso.enlace.href), rol), `${rol}: ${paso.enlace.href}`).toBe(true);
      }
    }
  });

  it("cada pantalla que un paso nombra la puede abrir ese rol", () => {
    for (const rol of ROLES_DEL_SISTEMA) {
      for (const { texto } of pasosDe(rol) ?? []) {
        for (const [palabra, pantalla] of PANTALLA_NOMBRADA) {
          if (palabra.test(texto)) expect(puedeAbrir(pantalla, rol), `${rol} lee «${texto}»`).toBe(true);
        }
      }
    }
  });

  it("solo a quien tiene el botón «+» se le habla de él, y solo de lo que ofrece", () => {
    for (const rol of ROLES_DEL_SISTEMA) {
      const registra = puedeAbrir("/crm/nuevo", rol);
      // Por rol: administración, dirección y liderazgo coordinan (el servidor lo afina con sus equipos).
      const coordina = puedeAbrir("/resumen", rol);
      const avisa = puedeAbrir("/avisar-incidencia", rol);
      const anota = puedeAbrir("/escucha-social", rol);
      const tieneBoton = opcionesDelBotonMas(coordina, registra, avisa, anota).length > 0;
      for (const { texto } of pasosDe(rol) ?? []) {
        if (/botón \+/.test(texto)) expect(tieneBoton, `${rol}: «${texto}»`).toBe(true);
        if (/registra a un ciudadano|Para registrar a alguien/.test(texto)) expect(registra, `${rol}: «${texto}»`).toBe(true);
        if (/levanta una incidencia/.test(texto)) expect(coordina, `${rol}: «${texto}»`).toBe(true);
        if (/avisar de una incidencia/i.test(texto)) expect(avisa, `${rol}: «${texto}»`).toBe(true);
        if (/lo que te pide un vecino/.test(texto)) expect(anota, `${rol}: «${texto}»`).toBe(true);
      }
    }
    // El brigadista ya tiene botón (D12): avisar de una incidencia, y se le dice.
    expect(pasosDe("visit_responsible")!.some((p) => /botón \+/.test(p.texto) && /avisar de una incidencia/i.test(p.texto))).toBe(true);
  });

  it("al pie, todos ven cómo reportar un problema, con un enlace que les abre", () => {
    expect(PIE_PARA_REPORTAR.enlace?.href).toBe("/reportar-problema");
    for (const rol of ROLES_DEL_SISTEMA) expect(puedeAbrir(ruta(PIE_PARA_REPORTAR.enlace!.href), rol), rol).toBe(true);
  });
});

describe("botón «+»", () => {
  it("Ciudadano primero; con una sola opción, esa; sin permisos, ningún botón", () => {
    const etiquetas = (coordina: boolean, registra: boolean, avisa = false, anota = false) => opcionesDelBotonMas(coordina, registra, avisa, anota).map((o) => o.etiqueta);
    expect(etiquetas(true, true)).toEqual(["Ciudadano", "Incidencia", "Evento o actividad"]);
    expect(etiquetas(false, true)).toEqual(["Ciudadano"]);
    expect(etiquetas(true, false)).toEqual(["Incidencia", "Evento o actividad"]);
    expect(etiquetas(false, false)).toEqual([]);
    // Avisar es para quien no coordina: quien coordina tiene la incidencia completa.
    expect(etiquetas(false, true, true)).toEqual(["Ciudadano", "Avisar de una incidencia"]);
    expect(etiquetas(false, false, true)).toEqual(["Avisar de una incidencia"]);
    expect(etiquetas(true, true, true)).toEqual(["Ciudadano", "Incidencia", "Evento o actividad"]);
    // «Petición de un vecino» la anotan los cinco perfiles (F3.6, D12), siempre al final.
    expect(etiquetas(true, true, false, true)).toEqual(["Ciudadano", "Incidencia", "Evento o actividad", "Petición de un vecino"]);
    expect(etiquetas(false, false, true, true)).toEqual(["Avisar de una incidencia", "Petición de un vecino"]);
    expect(etiquetas(false, false, false, true)).toEqual(["Petición de un vecino"]);
  });

  it("los cinco perfiles anotan una petición desde el «+» (D12)", () => {
    for (const rol of ROLES_DEL_SISTEMA) {
      const opciones = opcionesDelBotonMas(puedeAbrir("/resumen", rol), puedeAbrir("/crm/nuevo", rol), puedeAbrir("/avisar-incidencia", rol), puedeAbrir("/escucha-social", rol));
      expect(opciones.map((o) => o.href), rol).toContain("/escucha-social?nueva=1");
    }
  });

  it("cada opción lleva a una pantalla que el rol abre", () => {
    for (const rol of ROLES_DEL_SISTEMA) {
      for (const coordina of [true, false]) {
        for (const opcion of opcionesDelBotonMas(coordina, puedeAbrir("/crm/nuevo", rol), puedeAbrir("/avisar-incidencia", rol), puedeAbrir("/escucha-social", rol))) {
          expect(puedeAbrir(ruta(opcion.href), rol), `${rol}: ${opcion.href}`).toBe(true);
        }
      }
    }
  });

  it("el capturista conserva el alta a un toque en la barra; el brigadista tiene «+» con dos opciones (D12)", () => {
    // Antes: «el capturista tiene el alta a un toque; el brigadista, ningún botón». Con D12 el «+» del
    // capturista abre un menú de tres, así que el alta a un toque queda en «Registrar» de la barra de abajo.
    const de = (rol: string) =>
      opcionesDelBotonMas(false, puedeAbrir("/crm/nuevo", rol), puedeAbrir("/avisar-incidencia", rol), puedeAbrir("/escucha-social", rol)).map((o) => o.href);
    expect(de("capturist")).toEqual(["/crm/nuevo", "/avisar-incidencia", "/escucha-social?nueva=1"]);
    const menu = Object.values(primaryNavItems).flat().filter((i) => i.allowedRoles.includes("capturist"));
    expect(itemsDeBarraMovil("capturist", menu).map((i) => i.href)).toContain("/crm/nuevo");
    expect(de("visit_responsible")).toEqual(["/avisar-incidencia", "/escucha-social?nueva=1"]);
  });
});
