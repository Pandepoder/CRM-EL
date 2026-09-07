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
  it("amplía la búsqueda cuando dentro del AMG no hay nada", async () => {
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
});

describe("situar la consulta", () => {
  it("añade el municipio cuando el texto no dice dónde está", () => {
    expect(situarConsulta("Loma Dorada", "Tonalá")).toBe("Loma Dorada, Tonalá, Jalisco");
  });

  it("lo deja igual si el texto ya lo dice", () => {
    expect(situarConsulta("Loma Dorada, Tonalá", "Tonalá")).toBe("Loma Dorada, Tonalá");
    expect(situarConsulta("Centro, Zapopan", "Tonalá")).toBe("Centro, Zapopan");
  });
});
