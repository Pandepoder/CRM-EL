import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  celebrar,
  cerrarPrimerosPasos,
  EVENTO_CELEBRAR,
  EVENTO_PROGRESO,
  guardarInsigniasVistas,
  guardarRitmo,
  insigniasVistas,
  leerRitmo,
  pedirProgreso,
  primerosPasosCerrados,
  type Celebracion
} from "./celebraciones";

/**
 * Lo que «Mi día» guarda en el teléfono (ritmo, insignias ya celebradas, «Primeros pasos» cerrado) y el
 * reparto del progreso entre la tarjeta y la capa de celebración. Todo debe seguir funcionando con el
 * almacenamiento bloqueado (ventana privada): solo se pierde la preferencia.
 */

function almacen() {
  const datos = new Map<string, string>();
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    datos
  };
}

let ventana: EventTarget & { localStorage: ReturnType<typeof almacen> | object };

beforeEach(() => {
  ventana = Object.assign(new EventTarget(), { localStorage: almacen() });
  vi.stubGlobal("window", ventana);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("preferencias de «Mi día» en el teléfono", () => {
  it("el ritmo es «normal» hasta que la persona elige otro, y es por persona", () => {
    expect(leerRitmo("ana")).toBe("normal");
    guardarRitmo("ana", "con_todo");
    expect(leerRitmo("ana")).toBe("con_todo");
    expect(leerRitmo("beto")).toBe("normal");
  });

  it("un valor raro guardado no rompe: vuelve a «normal»", () => {
    (ventana.localStorage as ReturnType<typeof almacen>).setItem("mi-dia:ritmo:ana", "turbo");
    expect(leerRitmo("ana")).toBe("normal");
  });

  it("insignias vistas: null la primera vez, después las guardadas, y tolera basura", () => {
    expect(insigniasVistas("ana")).toBeNull();
    guardarInsigniasVistas("ana", ["primer-paso", "toca-toca"]);
    expect([...insigniasVistas("ana")!].sort()).toEqual(["primer-paso", "toca-toca"]);
    (ventana.localStorage as ReturnType<typeof almacen>).setItem("mi-dia:insignias:ana", "{no es json");
    expect(insigniasVistas("ana")).toEqual(new Set());
    (ventana.localStorage as ReturnType<typeof almacen>).setItem("mi-dia:insignias:ana", JSON.stringify(["a", 3, null]));
    expect([...insigniasVistas("ana")!]).toEqual(["a"]);
  });

  it("«Primeros pasos» se cierra una vez por persona", () => {
    expect(primerosPasosCerrados("ana")).toBe(false);
    cerrarPrimerosPasos("ana");
    expect(primerosPasosCerrados("ana")).toBe(true);
    expect(primerosPasosCerrados("beto")).toBe(false);
  });

  it("con el almacenamiento bloqueado todo sigue funcionando", () => {
    const bloqueado = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      }
    };
    vi.stubGlobal("window", Object.assign(new EventTarget(), { localStorage: bloqueado }));
    expect(() => guardarRitmo("ana", "tranquilo")).not.toThrow();
    expect(leerRitmo("ana")).toBe("normal");
    expect(insigniasVistas("ana")).toBeNull();
    expect(() => cerrarPrimerosPasos("ana")).not.toThrow();
    expect(primerosPasosCerrados("ana")).toBe(false);
  });
});

describe("celebrar y repartir el progreso", () => {
  it("celebrar avisa a la capa con lo que pasó", () => {
    const recibidas: Celebracion[] = [];
    ventana.addEventListener(EVENTO_CELEBRAR, (e) => recibidas.push((e as CustomEvent<Celebracion>).detail));
    celebrar({ tipo: "registro", titulo: "Ciudadano registrado" });
    expect(recibidas).toEqual([{ tipo: "registro", titulo: "Ciudadano registrado" }]);
  });

  it("dos pedidos a la vez hacen una sola petición, y el resultado llega a quien escucha", async () => {
    const progreso = { dia: "2026-10-07", hoy: { total: 3 } };
    const fetch = vi.fn(async () => new Response(JSON.stringify(progreso), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const escuchado: unknown[] = [];
    ventana.addEventListener(EVENTO_PROGRESO, (e) => escuchado.push((e as CustomEvent).detail));

    const [a, b] = await Promise.all([pedirProgreso(), pedirProgreso()]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/yo/progreso", { cache: "no-store" });
    expect(a).toEqual(progreso);
    expect(b).toEqual(progreso);
    expect(escuchado).toEqual([progreso]);

    // Terminado el primero, el siguiente sí vuelve a preguntar.
    await pedirProgreso();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("sin señal o sin sesión devuelve null y no avisa nada", async () => {
    const escuchado: unknown[] = [];
    ventana.addEventListener(EVENTO_PROGRESO, (e) => escuchado.push((e as CustomEvent).detail));
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }));
    expect(await pedirProgreso()).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    expect(await pedirProgreso()).toBeNull();
    expect(escuchado).toEqual([]);
  });
});
