import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clasificarRespuesta,
  confirmarTelefonoRepetido,
  descartarEnvio,
  enviarOEncolar,
  enviosDe,
  leerCola,
  nuevaClave,
  procesarCola
} from "./cola-de-envios";

/** `localStorage` mínimo, como el del navegador. */
class AlmacenFalso {
  datos = new Map<string, string>();
  getItem(k: string) { return this.datos.get(k) ?? null; }
  setItem(k: string, v: string) { this.datos.set(k, v); }
  removeItem(k: string) { this.datos.delete(k); }
}

type Respuesta = { status: number; cuerpo?: unknown; redirected?: boolean } | "sin-red";

/** `fetch` falso: responde en orden lo que se le pida y anota cada envío. */
function fetchFalso(respuestas: Respuesta[]) {
  const enviados: { url: string; cuerpo: Record<string, unknown> }[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    enviados.push({ url, cuerpo: JSON.parse(typeof init?.body === "string" ? init.body : "{}") });
    const r = respuestas.shift() ?? "sin-red";
    if (r === "sin-red") throw new TypeError("Failed to fetch");
    const cuerpo = r.cuerpo === undefined ? {} : r.cuerpo;
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      redirected: r.redirected ?? false,
      json: async () => {
        if (typeof cuerpo === "string") throw new SyntaxError("no es JSON");
        return cuerpo;
      }
    } as unknown as Response;
  });
  return { fn, enviados };
}

const alta = (clave: string, usuarioId: string | null = "u1") => ({
  clave,
  tipo: "ciudadano" as const,
  url: "/api/crm/contacts",
  cuerpo: { firstName: "Ana", clientRequestId: clave },
  descripcion: "Ciudadano: Ana",
  usuarioId
});

let almacen: AlmacenFalso;

beforeEach(() => {
  almacen = new AlmacenFalso();
  vi.stubGlobal("localStorage", almacen);
  vi.stubGlobal("window", new EventTarget());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("clasificarRespuesta", () => {
  it("2xx es enviado; sin respuesta, 401, 408, 429 y 5xx se reintentan; el resto se rechaza", () => {
    expect(clasificarRespuesta(201)).toBe("enviado");
    for (const s of [0, 401, 408, 429, 500, 503]) expect(clasificarRespuesta(s)).toBe("reintentar");
    for (const s of [400, 403, 404, 409, 422]) expect(clasificarRespuesta(s)).toBe("rechazado");
  });
});

describe("enviarOEncolar", () => {
  it("si el servidor confirma, no queda nada en el teléfono", async () => {
    const { fn } = fetchFalso([{ status: 201, cuerpo: { contactId: "c1" } }]);
    vi.stubGlobal("fetch", fn);
    const r = await enviarOEncolar(alta("k1"));
    expect(r).toMatchObject({ estado: "enviado", datos: { contactId: "c1" } });
    expect(leerCola()).toEqual([]);
  });

  it("sin señal queda guardado, con su clave, y dice por qué", async () => {
    vi.stubGlobal("fetch", fetchFalso(["sin-red"]).fn);
    const r = await enviarOEncolar(alta("k1"));
    expect(r).toEqual({ estado: "encolado", motivo: "sin-senal" });
    expect(leerCola()).toMatchObject([{ clave: "k1", estado: "pendiente", usuarioId: "u1", cuerpo: { clientRequestId: "k1" } }]);
  });

  it("con la sesión caducada (401) también se guarda: se envía al volver a entrar", async () => {
    vi.stubGlobal("fetch", fetchFalso([{ status: 401, cuerpo: { code: "unauthorized" } }]).fn);
    expect(await enviarOEncolar(alta("k1"))).toEqual({ estado: "encolado", motivo: "sesion" });
  });

  it("un «200» que no es la API (la página de acceso de una WiFi) no cuenta como enviado", async () => {
    vi.stubGlobal("fetch", fetchFalso([{ status: 200, cuerpo: "<html>Acepta los términos</html>" }]).fn);
    expect(await enviarOEncolar(alta("k1"))).toEqual({ estado: "encolado", motivo: "sin-senal" });
    vi.stubGlobal("fetch", fetchFalso([{ status: 200, cuerpo: { ok: true }, redirected: true }]).fn);
    expect(await enviarOEncolar(alta("k2"))).toEqual({ estado: "encolado", motivo: "sin-senal" });
  });

  it("un rechazo del servidor no se guarda: vuelve al formulario con el motivo y el campo", async () => {
    const cuerpo = { message: "La sección 99999 no existe", campo: "sectionNum", code: "territorio_invalido" };
    vi.stubGlobal("fetch", fetchFalso([{ status: 400, cuerpo }]).fn);
    const r = await enviarOEncolar(alta("k1"));
    // `datos` lleva la respuesta entera: el aviso de teléfono repetido trae ahí la ficha que ya existe.
    expect(r).toEqual({ estado: "rechazado", http: 400, error: "La sección 99999 no existe", codigo: "territorio_invalido", campo: "sectionNum", datos: cuerpo });
    expect(leerCola()).toEqual([]);
  });

  it("sin almacenamiento disponible no finge haber guardado", async () => {
    vi.stubGlobal("fetch", fetchFalso(["sin-red"]).fn);
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => { throw new Error("QuotaExceededError"); },
      removeItem: () => undefined
    });
    const r = await enviarOEncolar(alta("k1"));
    expect(r.estado).toBe("sin-cola");
  });

  it("reintentar desde el formulario el mismo envío no lo duplica en la cola, y al confirmarse sale", async () => {
    vi.stubGlobal("fetch", fetchFalso(["sin-red", "sin-red"]).fn);
    await enviarOEncolar(alta("k1"));
    await enviarOEncolar(alta("k1"));
    expect(leerCola()).toHaveLength(1);
    vi.stubGlobal("fetch", fetchFalso([{ status: 200, cuerpo: { contactId: "c1", repetido: true } }]).fn);
    await enviarOEncolar(alta("k1"));
    expect(leerCola()).toEqual([]);
  });
});

describe("procesarCola", () => {
  it("reenvía con el mismo cuerpo (y la misma clave) y vacía la cola", async () => {
    vi.stubGlobal("fetch", fetchFalso(["sin-red", "sin-red"]).fn);
    await enviarOEncolar(alta("k1"));
    await enviarOEncolar(alta("k2"));
    const { fn, enviados } = fetchFalso([{ status: 201, cuerpo: {} }, { status: 200, cuerpo: { repetido: true } }]);
    vi.stubGlobal("fetch", fn);
    expect(await procesarCola("u1")).toEqual({ enviados: 2, pendientes: 0, rechazados: 0 });
    expect(enviados.map((e) => e.cuerpo.clientRequestId)).toEqual(["k1", "k2"]);
    expect(leerCola()).toEqual([]);
  });

  it("un rechazo queda a la vista con su motivo; no se pierde en silencio", async () => {
    vi.stubGlobal("fetch", fetchFalso(["sin-red"]).fn);
    await enviarOEncolar(alta("k1"));
    vi.stubGlobal("fetch", fetchFalso([{ status: 409, cuerpo: { error: "Esta solicitud ya se usó." } }]).fn);
    expect(await procesarCola("u1")).toEqual({ enviados: 0, pendientes: 0, rechazados: 1 });
    expect(leerCola()).toMatchObject([{ clave: "k1", estado: "rechazado", error: "Esta solicitud ya se usó." }]);
    descartarEnvio("k1");
    expect(leerCola()).toEqual([]);
  });

  it("un teléfono repetido se confirma desde el aviso: vuelve a la cola con la confirmación y se envía", async () => {
    vi.stubGlobal("fetch", fetchFalso(["sin-red"]).fn);
    await enviarOEncolar(alta("k1"));
    vi.stubGlobal("fetch", fetchFalso([{ status: 409, cuerpo: { code: "telefono_repetido", message: "Ese teléfono ya está registrado" } }]).fn);
    expect(await procesarCola("u1")).toEqual({ enviados: 0, pendientes: 0, rechazados: 1 });
    expect(leerCola()).toMatchObject([{ clave: "k1", estado: "rechazado", codigo: "telefono_repetido" }]);

    confirmarTelefonoRepetido("k1");
    expect(leerCola()).toMatchObject([{ clave: "k1", estado: "pendiente", cuerpo: { confirmarTelefonoRepetido: true } }]);
    const { fn, enviados } = fetchFalso([{ status: 201, cuerpo: { contactId: "c1" } }]);
    vi.stubGlobal("fetch", fn);
    expect(await procesarCola("u1")).toEqual({ enviados: 1, pendientes: 0, rechazados: 0 });
    expect(enviados[0]?.cuerpo).toMatchObject({ clientRequestId: "k1", confirmarTelefonoRepetido: true });
  });

  it("otro rechazo no se puede «confirmar»: sigue rechazado", async () => {
    vi.stubGlobal("fetch", fetchFalso(["sin-red"]).fn);
    await enviarOEncolar(alta("k1"));
    vi.stubGlobal("fetch", fetchFalso([{ status: 400, cuerpo: { code: "territorio_invalido", message: "Sección inexistente" } }]).fn);
    await procesarCola("u1");
    confirmarTelefonoRepetido("k1");
    expect(leerCola()).toMatchObject([{ clave: "k1", estado: "rechazado" }]);
  });

  it("sin señal se detiene en el primero y no gasta intentos en los demás", async () => {
    vi.stubGlobal("fetch", fetchFalso(["sin-red", "sin-red", "sin-red"]).fn);
    await enviarOEncolar(alta("k1"));
    await enviarOEncolar(alta("k2"));
    const { fn } = fetchFalso(["sin-red"]);
    vi.stubGlobal("fetch", fn);
    expect(await procesarCola("u1")).toEqual({ enviados: 0, pendientes: 2, rechazados: 0 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("en un teléfono compartido no envía lo de otra persona con esta sesión; lo público sí", async () => {
    vi.stubGlobal("fetch", fetchFalso(["sin-red", "sin-red", "sin-red"]).fn);
    await enviarOEncolar(alta("de-ana", "ana"));
    await enviarOEncolar(alta("de-beto", "beto"));
    await enviarOEncolar(alta("publico", null));
    expect(enviosDe("beto").map((e) => e.clave)).toEqual(["de-beto", "publico"]);
    const { fn, enviados } = fetchFalso([{ status: 201, cuerpo: {} }, { status: 201, cuerpo: {} }]);
    vi.stubGlobal("fetch", fn);
    await procesarCola("beto");
    expect(enviados.map((e) => e.cuerpo.clientRequestId)).toEqual(["de-beto", "publico"]);
    expect(leerCola().map((e) => e.clave)).toEqual(["de-ana"]);
  });
});

describe("nuevaClave", () => {
  it("es un UUID v4 válido también sin crypto.randomUUID (contexto no seguro)", () => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(nuevaClave()).toMatch(uuid);
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: (b: Uint8Array) => real.getRandomValues(b) });
    const sinRandomUUID = nuevaClave();
    vi.unstubAllGlobals();
    expect(sinRandomUUID).toMatch(uuid);
  });
});
