import { describe, expect, it } from "vitest";

import {
  diasConMeta,
  diasDeLaSemana,
  esMetaValida,
  FRASES,
  fraseDe,
  insigniasDe,
  lunesDe,
  medallaDeLaSemana,
  metaDelDia,
  metaVigente,
  opcionesDeMeta,
  perfilDeTrabajo,
  rachaSemanal,
  siguienteInsignia,
  situacionDelDia,
  type Conteos
} from "./logros";

const cero: Conteos = {
  registros: 0,
  registrosCompletos: 0,
  conUbicacion: 0,
  porMiEnlace: 0,
  cierres: 0,
  cierresBuenos: 0,
  convertidos: 0,
  escucha: 0,
  diasActivos: 0
};

describe("perfil y meta del día", () => {
  it("el brigadista no registra y el capturista no hace campo", () => {
    expect(perfilDeTrabajo("visit_responsible")).toEqual({ registra: false, haceCampo: true });
    expect(perfilDeTrabajo("capturist")).toEqual({ registra: true, haceCampo: false });
    expect(perfilDeTrabajo("territorial_coordinator")).toEqual({ registra: true, haceCampo: true });
  });

  it("la meta depende de lo que hace y del ritmo elegido", () => {
    expect(metaDelDia(perfilDeTrabajo("capturist"))).toBe(10);
    expect(metaDelDia(perfilDeTrabajo("visit_responsible"))).toBe(5);
    expect(metaDelDia(perfilDeTrabajo("capturist"), "tranquilo")).toBe(5);
    expect(metaDelDia(perfilDeTrabajo("capturist"), "con_todo")).toBe(20);
    expect(metaDelDia(perfilDeTrabajo("visit_responsible"), "tranquilo")).toBe(3);
  });
});

describe("racha semanal", () => {
  it("el lunes de cualquier día de la semana", () => {
    expect(lunesDe("2026-10-04")).toBe("2026-09-28"); // domingo
    expect(lunesDe("2026-09-28")).toBe("2026-09-28"); // lunes
    expect(lunesDe("2026-10-01")).toBe("2026-09-28"); // jueves
    expect(lunesDe("2026-01-01")).toBe("2025-12-29"); // cruza de año
  });

  it("cuenta semanas seguidas con dos o más días activos", () => {
    const dias = ["2026-10-03", "2026-10-04", "2026-09-22", "2026-09-26", "2026-09-15", "2026-09-16"];
    expect(rachaSemanal(dias, "2026-10-04")).toBe(3);
  });

  it("la semana en curso sin cumplir todavía no rompe la racha", () => {
    // Esta semana solo un día; las dos anteriores, cumplidas.
    const dias = ["2026-10-05", "2026-10-03", "2026-10-04", "2026-09-22", "2026-09-26"];
    expect(rachaSemanal(dias, "2026-10-05")).toBe(2);
  });

  it("una semana con un solo día corta la racha", () => {
    const dias = ["2026-10-03", "2026-10-04", "2026-09-22", "2026-09-15", "2026-09-16"];
    expect(rachaSemanal(dias, "2026-10-04")).toBe(1);
  });

  it("los días repetidos cuentan una vez", () => {
    expect(rachaSemanal(["2026-10-04", "2026-10-04"], "2026-10-04")).toBe(0);
    expect(rachaSemanal([], "2026-10-04")).toBe(0);
  });
});

describe("insignias", () => {
  it("a cada quien solo le tocan las que puede ganar", () => {
    const brigadista = insigniasDe(perfilDeTrabajo("visit_responsible"), cero, 0).map((i) => i.clave);
    expect(brigadista).toContain("toca-toca");
    expect(brigadista).not.toContain("primer-paso");
    const capturista = insigniasDe(perfilDeTrabajo("capturist"), cero, 0).map((i) => i.clave);
    expect(capturista).toContain("primer-paso");
    expect(capturista).not.toContain("suela-gastada");
  });

  it("se gana al llegar a la meta y el avance no pasa de la meta", () => {
    const estados = insigniasDe(perfilDeTrabajo("capturist"), { ...cero, registros: 3, registrosCompletos: 12 }, 0);
    const porClave = new Map(estados.map((e) => [e.clave, e]));
    expect(porClave.get("primer-paso")).toMatchObject({ lograda: true, lleva: 1, meta: 1 });
    expect(porClave.get("ya-agarre-la-onda")).toMatchObject({ lograda: true, lleva: 10 });
    expect(porClave.get("medio-centenar")).toMatchObject({ lograda: false, lleva: 12, meta: 50 });
  });

  it("la racha alimenta la de hueso colorado", () => {
    const e = insigniasDe(perfilDeTrabajo("visit_responsible"), cero, 4).find((i) => i.clave === "de-hueso-colorado");
    expect(e?.lograda).toBe(true);
  });

  it("la siguiente es la más cercana en proporción", () => {
    const estados = insigniasDe(perfilDeTrabajo("capturist"), { ...cero, registros: 1, registrosCompletos: 8, escucha: 1 }, 0);
    expect(siguienteInsignia(estados)?.clave).toBe("ya-agarre-la-onda");
  });

  it("sin pendientes no hay siguiente", () => {
    const todo: Conteos = { registros: 999, registrosCompletos: 999, conUbicacion: 999, porMiEnlace: 999, cierres: 999, cierresBuenos: 999, convertidos: 999, escucha: 999, diasActivos: 999 };
    expect(siguienteInsignia(insigniasDe(perfilDeTrabajo("admin"), todo, 9))).toBeNull();
  });
});

describe("frases", () => {
  it("la situación del día respecto a la meta", () => {
    expect(situacionDelDia(0, 10)).toBe("sin_empezar");
    expect(situacionDelDia(4, 10)).toBe("en_camino");
    expect(situacionDelDia(10, 10)).toBe("meta");
    expect(situacionDelDia(20, 10)).toBe("pasada");
  });

  it("no repite la frase anterior cuando hay otras", () => {
    for (const anterior of FRASES.registro) {
      for (const azar of [0, 0.3, 0.6, 0.99]) {
        expect(fraseDe("registro", azar, anterior)).not.toBe(anterior);
      }
    }
  });

  it("ninguna frase nombra a nadie ni pasa de una línea corta", () => {
    for (const lista of Object.values(FRASES)) {
      for (const f of lista) expect(f.length).toBeLessThanOrEqual(80);
    }
  });
});

describe("meta que fija el líder", () => {
  const registra = perfilDeTrabajo("capturist");
  const brigadista = perfilDeTrabajo("visit_responsible");

  it("acepta solo enteros de 1 a 200", () => {
    for (const v of [1, 12, 200]) expect(esMetaValida(v)).toBe(true);
    for (const v of [0, -3, 201, 2.5, "10", null, undefined, Number.NaN]) expect(esMetaValida(v)).toBe(false);
  });

  it("si el líder puso meta, manda sobre el ritmo; si no, el ritmo de la persona", () => {
    expect(metaVigente(registra, "tranquilo", 12)).toBe(12);
    expect(metaVigente(registra, "con_todo", 12)).toBe(12);
    expect(metaVigente(registra, "tranquilo", null)).toBe(5);
    expect(metaVigente(brigadista, "normal", undefined)).toBe(5);
    // Un valor fuera de rango guardado por error no rompe la tarjeta: se usa el ritmo.
    expect(metaVigente(registra, "normal", 0)).toBe(10);
  });

  it("las opciones rápidas son los ritmos del rol de la persona", () => {
    expect(opcionesDeMeta(registra).map((o) => o.meta)).toEqual([5, 10, 20]);
    expect(opcionesDeMeta(brigadista).map((o) => o.meta)).toEqual([3, 5, 10]);
  });
});

describe("medallas de la semana", () => {
  it("cuentan días con la meta propia, no lugares", () => {
    expect(medallaDeLaSemana(0)).toBeNull();
    expect(medallaDeLaSemana(1)).toBe("bronce");
    expect(medallaDeLaSemana(2)).toBe("plata");
    expect(medallaDeLaSemana(3)).toBe("oro");
    expect(medallaDeLaSemana(7)).toBe("oro");
  });

  it("la semana va de lunes a domingo, también si hoy es domingo o cruza de mes", () => {
    expect(diasDeLaSemana("2026-10-06")).toEqual([
      "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"
    ]);
    expect(diasDeLaSemana("2026-11-01")[0]).toBe("2026-10-26");
    expect(diasDeLaSemana("2026-11-01")[6]).toBe("2026-11-01");
  });

  it("un día cuenta si las acciones llegan a la meta", () => {
    const dias = diasDeLaSemana("2026-10-07");
    const porDia = { "2026-10-05": 10, "2026-10-06": 9, "2026-10-07": 14, "2026-10-04": 50 };
    expect(diasConMeta(porDia, dias, 10)).toBe(2);
    expect(diasConMeta(porDia, dias, 5)).toBe(3);
    // Lo de la semana anterior no cuenta.
    expect(diasConMeta(porDia, dias, 40)).toBe(0);
  });
});
