import { describe, expect, it } from "vitest";

import { MENSAJE_GENERAL, mensajeDeCampo } from "./mensajes-de-validacion";

describe("mensajes de validación del alta", () => {
  it("dice qué corregir en los campos que más fallan, en español", () => {
    expect(mensajeDeCampo("birthYear")).toMatch(/4 dígitos/);
    expect(mensajeDeCampo("phone")).toMatch(/10 dígitos/);
    expect(mensajeDeCampo("email")).toMatch(/correo/);
    expect(mensajeDeCampo("firstName")).toBe("Escribe el nombre.");
  });

  it("sin campo conocido, un mensaje general que no es el de Zod en inglés", () => {
    expect(mensajeDeCampo(undefined)).toBe(MENSAJE_GENERAL);
    expect(mensajeDeCampo("campoQueNoExiste")).toBe(MENSAJE_GENERAL);
    expect(MENSAJE_GENERAL).not.toMatch(/expected|invalid|too small/i);
  });
});
