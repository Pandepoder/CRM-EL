import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { anotarCapaDeAvisos, avisar, EVENTO_AVISO, type Aviso } from "./avisos";

/**
 * Avisos dentro de la página (L12): con la capa del panel montada, el aviso va a la capa; sin ella
 * (páginas públicas), sale el `alert()` de siempre. Un aviso nunca se pierde.
 */
describe("avisar", () => {
  let recibidos: Aviso[] = [];
  let ventana = Object.assign(new EventTarget(), { alert: vi.fn() });

  beforeEach(() => {
    recibidos = [];
    ventana = Object.assign(new EventTarget(), { alert: vi.fn() });
    vi.stubGlobal("window", ventana);
    ventana.addEventListener(EVENTO_AVISO, (e) => recibidos.push((e as CustomEvent<Aviso>).detail));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sin capa montada usa el alert del navegador", () => {
    avisar("No se pudo guardar.");
    expect(ventana.alert).toHaveBeenCalledWith("No se pudo guardar.");
    expect(recibidos).toEqual([]);
  });

  it("con la capa montada manda el aviso a la capa, con su tipo (error por omisión)", () => {
    const desanotar = anotarCapaDeAvisos();
    avisar("Revisa tu señal.");
    avisar("Listo, guardado.", "exito");
    desanotar();
    expect(ventana.alert).not.toHaveBeenCalled();
    expect(recibidos).toEqual([
      { texto: "Revisa tu señal.", tipo: "error" },
      { texto: "Listo, guardado.", tipo: "exito" }
    ]);
  });

  it("un aviso puede llevar un botón y su propia duración", () => {
    const desanotar = anotarCapaDeAvisos();
    avisar("Te respondieron un reporte.", "info", { accion: { etiqueta: "Ver respuesta", href: "/reportar-problema" }, duracion: 15_000 });
    avisar("Se queda hasta que lo cierren.", "error", { duracion: null });
    desanotar();
    expect(recibidos).toEqual([
      { texto: "Te respondieron un reporte.", tipo: "info", accion: { etiqueta: "Ver respuesta", href: "/reportar-problema" }, duracion: 15_000 },
      { texto: "Se queda hasta que lo cierren.", tipo: "error", duracion: null }
    ]);
  });

  it("al desmontarse la capa vuelve al alert, aunque se desanote dos veces", () => {
    const desanotar = anotarCapaDeAvisos();
    desanotar();
    desanotar();
    avisar("Otra vez sin capa.");
    expect(ventana.alert).toHaveBeenCalledTimes(1);
  });

  it("en el servidor no hace nada", () => {
    vi.unstubAllGlobals();
    expect(() => avisar("sin ventana")).not.toThrow();
  });
});
