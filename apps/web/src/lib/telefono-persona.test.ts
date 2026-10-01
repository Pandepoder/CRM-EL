import { describe, expect, it } from "vitest";

import { validarTelefonoOpcional } from "./telefono-persona";

describe("teléfono opcional de quien se suma", () => {
  it("vacío o ausente es válido y queda sin teléfono", () => {
    expect(validarTelefonoOpcional(undefined)).toEqual({ ok: true, telefono: null });
    expect(validarTelefonoOpcional("   ")).toEqual({ ok: true, telefono: null });
  });

  it("acepta un número con espacios o guiones", () => {
    expect(validarTelefonoOpcional(" 33 1234-5678 ")).toEqual({ ok: true, telefono: "33 1234-5678" });
  });

  it("rechaza lo que no se puede marcar", () => {
    expect(validarTelefonoOpcional("123").ok).toBe(false);
    expect(validarTelefonoOpcional("sin teléfono").ok).toBe(false);
    expect(validarTelefonoOpcional("1".repeat(21)).ok).toBe(false);
  });
});
