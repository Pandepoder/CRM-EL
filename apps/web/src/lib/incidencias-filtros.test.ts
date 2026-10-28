import { describe, expect, it } from "vitest";

import { diasEntre, direccionDeFiltros, haceCuanto, leerFiltrosDeIncidencias, urgenciaPorDias } from "./incidencias-filtros";

describe("filtros de Incidencias", () => {
  it("lee la dirección e ignora lo que no entiende", () => {
    expect(leerFiltrosDeIncidencias({})).toMatchObject({ vista: "atender", categoria: null, seccion: null, responsable: null, antiguedad: null, porAceptar: false, sinSeccion: false, pagina: 1, q: "" });
    expect(leerFiltrosDeIncidencias({ vista: "cerradas", categoria: "fuga_agua", seccion: "2695", responsable: "mias", antiguedad: "7", por_aceptar: "1", sin_seccion: "1", page: "3" })).toMatchObject({
      vista: "cerradas", categoria: "fuga_agua", seccion: 2695, responsable: "mias", antiguedad: 7, porAceptar: true, sinSeccion: true, pagina: 3
    });
    expect(leerFiltrosDeIncidencias({ vista: "x", categoria: "<script>", seccion: "-1", responsable: "alguien", antiguedad: "9", page: "abc" })).toMatchObject({
      vista: "atender", categoria: null, seccion: null, responsable: null, antiguedad: null, pagina: 1
    });
  });

  it("el texto del buscador nunca va en la dirección (privacidad)", () => {
    const f = leerFiltrosDeIncidencias({ vista: "todas", q: "María Pérez", page: "2" });
    expect(f.q).toBe("María Pérez");
    const direccion = direccionDeFiltros(f);
    expect(direccion).toBe("?vista=todas&page=2");
    expect(direccion).not.toMatch(/Mar|P%C3%A9rez|q=/);
  });

  it("los días se cuentan en hora de Jalisco", () => {
    // 23:30 del 14 en Jalisco (05:30 del 15 en UTC) y 00:30 del 15: un día, aunque pasó una hora.
    expect(diasEntre(new Date("2026-10-15T05:30:00Z"), new Date("2026-10-15T06:30:00Z"))).toBe(1);
    expect(diasEntre(new Date("2026-10-15T07:00:00Z"), new Date("2026-10-15T23:00:00Z"))).toBe(0);
    expect(haceCuanto(0)).toBe("hoy");
    expect(haceCuanto(1)).toBe("ayer");
    expect(haceCuanto(9)).toBe("hace 9 días");
  });

  it("verde menos de 3 días, ámbar de 3 a 7, rojo más de 7", () => {
    expect([0, 2, 3, 7, 8].map(urgenciaPorDias)).toEqual(["reciente", "reciente", "atencion", "atencion", "urgente"]);
  });
});
