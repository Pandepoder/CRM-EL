import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getSessionOptions } from "./session.js";

const SIETE_DIAS = 7 * 24 * 3600;

describe("caducidad de la sesión", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env.SESSION_SECRET = "x".repeat(32);
    delete process.env.SESSION_TTL_HOURS;
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it("dura 7 días si no se configura, en vez de los 14 implícitos de iron-session", () => {
    expect(getSessionOptions().ttl).toBe(SIETE_DIAS);
  });

  it("acepta una duración configurada en horas", () => {
    process.env.SESSION_TTL_HOURS = "12";

    expect(getSessionOptions().ttl).toBe(12 * 3600);
  });

  it("trata una variable vacía como ausente", () => {
    process.env.SESSION_TTL_HOURS = "  ";

    expect(getSessionOptions().ttl).toBe(SIETE_DIAS);
  });

  it("rechaza valores que no son horas enteras dentro del rango", () => {
    for (const malo of ["0", "-5", "1.5", "doce", "721"]) {
      process.env.SESSION_TTL_HOURS = malo;
      expect(() => getSessionOptions(), malo).toThrow(/SESSION_TTL_HOURS/);
    }
  });

  /**
   * La trampa de iron-session: con `cookieOptions.maxAge` presente deja de derivarlo de `ttl`, y
   * con `maxAge: undefined` pone ttl = 0, es decir, una sesión que no caduca nunca. La caducidad
   * de la cookie tiene que salir solo de `ttl`.
   */
  it("no fija maxAge a mano, para que iron-session lo derive de ttl", () => {
    expect("maxAge" in (getSessionOptions().cookieOptions ?? {})).toBe(false);
  });

  it("sigue exigiendo un secreto de al menos 32 caracteres", () => {
    process.env.SESSION_SECRET = "corto";

    expect(() => getSessionOptions()).toThrow(/SESSION_SECRET/);
  });
});
