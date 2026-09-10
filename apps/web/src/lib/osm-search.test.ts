import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buscarDireccion, buscarEnOSM, invalidarCacheOSM, situarConsulta } from "./osm-search.js";

/**
 * Nominatim admite una petición por segundo y bloquea a quien abusa, y todas
 * las de este sistema salen por la única IP del servidor. Lo que se prueba aquí
 * es justo lo que evita quedarse sin buscador de domicilios en plena jornada.
 */

function respuesta(cuerpo: unknown, estado = 200) {
  return {
    ok: estado >= 200 && estado < 300,
    status: estado,
    json: async () => cuerpo
  } as unknown as Response;
}

const UNA_FILA = [{ lat: "20.62", lon: "-103.24", display_name: "Av. Río Nilo, Tonalá", address: {} }];

let fetchFalso: ReturnType<typeof vi.fn>;

/** Recuadro (viewbox) que llevó la n-ésima petición a Nominatim, como números. */
function recuadroDeLlamada(n: number): [number, number, number, number] {
  const url = new URL(String(fetchFalso.mock.calls[n]?.[0]));
  const [izq = NaN, arriba = NaN, der = NaN, abajo = NaN] = (url.searchParams.get("viewbox") ?? "").split(",").map(Number);
  return [izq, arriba, der, abajo];
}

beforeEach(() => {
  invalidarCacheOSM();
  fetchFalso = vi.fn(async () => respuesta(UNA_FILA));
  vi.stubGlobal("fetch", fetchFalso);
});

afterEach(() => {
  vi.unstubAllGlobals();
  invalidarCacheOSM();
});

describe("caché de búsquedas", () => {
  it("no vuelve a preguntar por la misma dirección", async () => {
    const primera = await buscarEnOSM("Av. Río Nilo, Tonalá, Jalisco", { acotado: true });
    const segunda = await buscarEnOSM("Av. Río Nilo, Tonalá, Jalisco", { acotado: true });

    expect(primera.filas).toHaveLength(1);
    expect(segunda.filas).toHaveLength(1);
    // Una brigada teclea la misma calle decenas de veces en una colonia.
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it("distingue mayúsculas y espacios como la misma búsqueda", async () => {
    await buscarEnOSM("Av. Río Nilo", { acotado: true });
    await buscarEnOSM("  AV. RÍO NILO  ", { acotado: true });

    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it("guarda también las respuestas vacías", async () => {
    fetchFalso.mockResolvedValue(respuesta([]));

    await buscarEnOSM("calle que no existe", { acotado: true });
    await buscarEnOSM("calle que no existe", { acotado: true });

    // Un "aquí no hay nada" es una respuesta legítima; repetirla no aporta.
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });
});

describe("cuando Nominatim rechaza la petición", () => {
  it("lo marca como saturado en vez de fingir que no hay resultados", async () => {
    fetchFalso.mockResolvedValue(respuesta([], 429));

    const resultado = await buscarEnOSM("Av. Río Nilo", { acotado: true });

    expect(resultado.filas).toHaveLength(0);
    // Antes esto devolvía una lista vacía, indistinguible de "no encontrado":
    // en pantalla se leía como que el domicilio no existía.
    expect(resultado.saturado).toBe(true);
  });

  it("no guarda en caché un rechazo", async () => {
    fetchFalso.mockResolvedValueOnce(respuesta([], 429));
    fetchFalso.mockResolvedValue(respuesta(UNA_FILA));

    const fallida = await buscarEnOSM("Av. Río Nilo", { acotado: true });
    const buena = await buscarEnOSM("Av. Río Nilo", { acotado: true });

    expect(fallida.saturado).toBe(true);
    expect(buena.filas).toHaveLength(1);
    expect(buena.saturado).toBe(false);
  });

  it("marca saturado también si la red falla o se agota el tiempo", async () => {
    fetchFalso.mockRejectedValue(new Error("network down"));

    const resultado = await buscarEnOSM("Av. Río Nilo", { acotado: true });

    expect(resultado).toEqual({ filas: [], saturado: true });
  });
});

describe("ampliación a Jalisco", () => {
  it("amplía la búsqueda cuando dentro del municipio no hay nada", async () => {
    fetchFalso.mockResolvedValueOnce(respuesta([]));
    fetchFalso.mockResolvedValue(respuesta(UNA_FILA));

    const resultado = await buscarDireccion("Un Pueblo Lejano", "Tonalá");

    expect(fetchFalso).toHaveBeenCalledTimes(2);
    expect(resultado.filas).toHaveLength(1);
  });

  it("NO insiste cuando la primera consulta fue rechazada", async () => {
    fetchFalso.mockResolvedValue(respuesta([], 429));

    const resultado = await buscarDireccion("Av. Río Nilo", "Tonalá");

    // Antes el rechazo devolvía lista vacía, se interpretaba como "sin
    // resultados" y disparaba una segunda petición: cada bloqueo generaba mas
    // trafico, justo cuando menos convenía.
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(resultado.saturado).toBe(true);
  });

  it("no amplía cuando ya encontró algo cerca", async () => {
    const resultado = await buscarDireccion("Av. Río Nilo", "Tonalá");

    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(resultado.filas).toHaveLength(1);
  });

  it("sin municipio conocido busca una sola vez en todo Jalisco", async () => {
    await buscarDireccion("Av. Hidalgo 10", null);

    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [izq, arriba, der, abajo] = recuadroDeLlamada(0);
    // Debe cubrir de Puerto Vallarta (-105.2) a Lagos de Moreno (-101.9).
    expect(izq).toBeLessThan(-105);
    expect(der).toBeGreaterThan(-102);
    expect(arriba).toBeGreaterThan(abajo);
  });

  it("acota al recuadro del municipio de captura aunque esté fuera del AMG", async () => {
    await buscarDireccion("Av. México 100", "Puerto Vallarta");

    // Antes la primera consulta iba siempre al recuadro del AMG, a 250 km de
    // Vallarta: el buscador ni siquiera miraba el municipio en que se capturaba.
    const [izq, , der] = recuadroDeLlamada(0);
    expect(izq).toBeLessThan(-105);
    expect(der).toBeLessThan(-104.5);
  });
});

describe("situar la consulta", () => {
  it("añade el municipio cuando el texto no dice dónde está", () => {
    expect(situarConsulta("Loma Dorada", "Tonalá")).toBe("Loma Dorada, Tonalá, Jalisco");
  });

  it("lo deja igual si el texto ya lo dice", () => {
    expect(situarConsulta("Loma Dorada, Tonalá", "Tonalá")).toBe("Loma Dorada, Tonalá");
    expect(situarConsulta("Centro, Zapopan", "Tonalá")).toBe("Centro, Zapopan");
  });

  it("reconoce cualquier municipio de Jalisco, no solo los del AMG", () => {
    expect(situarConsulta("Centro, Tepatitlán de Morelos", "Tonalá")).toBe("Centro, Tepatitlán de Morelos");
    expect(situarConsulta("Malecón, puerto vallarta", "Zapopan")).toBe("Malecón, puerto vallarta");
  });

  it("no confunde una calle con nombre de municipio con el municipio", () => {
    // "Tequila" es un municipio, pero aquí es una calle de Guadalajara.
    expect(situarConsulta("Calle Tequila 123", "Guadalajara")).toBe("Calle Tequila 123, Guadalajara, Jalisco");
  });

  it("sin municipio de captura solo sitúa en Jalisco", () => {
    expect(situarConsulta("Av. Hidalgo 10", null)).toBe("Av. Hidalgo 10, Jalisco");
  });
});
