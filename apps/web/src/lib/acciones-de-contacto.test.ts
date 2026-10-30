import { describe, expect, it } from "vitest";

import { enlaceComoLlegar, enlaceDeWhatsApp, enlaceParaLlamar, telefonoInternacional } from "./acciones-de-contacto";

describe("teléfono internacional", () => {
  it("antepone el 52 a un número nacional, con o sin separadores", () => {
    expect(telefonoInternacional("3312345678")).toBe("523312345678");
    expect(telefonoInternacional("33 1234 5678")).toBe("523312345678");
    expect(telefonoInternacional("(33) 1234-5678")).toBe("523312345678");
  });

  it("respeta el que ya trae lada de país y quita el 1 del formato viejo de celular", () => {
    expect(telefonoInternacional("+52 33 1234 5678")).toBe("523312345678");
    expect(telefonoInternacional("5213312345678")).toBe("523312345678");
  });

  it("descarta lo que no es un teléfono", () => {
    expect(telefonoInternacional("")).toBeNull();
    expect(telefonoInternacional(null)).toBeNull();
    expect(telefonoInternacional("12345")).toBeNull();
    // Un valor cifrado que no se pudo leer no se convierte en un número inventado.
    expect(telefonoInternacional("enc:v1:abc123==")).toBeNull();
  });
});

describe("enlaces de un toque", () => {
  it("llamar y WhatsApp", () => {
    expect(enlaceParaLlamar("33 1234 5678")).toBe("tel:+523312345678");
    expect(enlaceDeWhatsApp("33 1234 5678")).toBe("https://wa.me/523312345678");
    expect(enlaceParaLlamar("3651234")).toBe("tel:3651234");
    expect(enlaceDeWhatsApp("3651234")).toBeNull();
    expect(enlaceParaLlamar(null)).toBeNull();
  });

  it("cómo llegar: el punto exacto gana; sin punto, el domicilio", () => {
    expect(enlaceComoLlegar({ lat: 20.6236, lng: -103.2423, direccion: "Juárez 10" })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=20.623600,-103.242300"
    );
    expect(enlaceComoLlegar({ direccion: "Juárez 10, Centro, Tonalá, Jalisco" })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Ju%C3%A1rez%2010%2C%20Centro%2C%20Tonal%C3%A1%2C%20Jalisco"
    );
    expect(enlaceComoLlegar({ lat: 0, lng: 0 })).toBeNull();
    expect(enlaceComoLlegar({ direccion: "" })).toBeNull();
  });
});
