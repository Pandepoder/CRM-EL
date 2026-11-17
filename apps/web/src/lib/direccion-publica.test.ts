import { describe, expect, it } from "vitest";

import { origenPublico } from "./direccion-publica";

describe("la dirección pública para la vista previa al compartir", () => {
  it("en el servidor usa DOMAIN, con https, sin importar lo que diga la petición", () => {
    expect(origenPublico("elapp.com.mx", "otro-sitio.com", "http").href).toBe("https://elapp.com.mx/");
  });

  it("sin DOMAIN (o con el localhost de docker-compose) usa el Host de la petición", () => {
    expect(origenPublico(undefined, "pruebas.elapp.com.mx", "https").href).toBe("https://pruebas.elapp.com.mx/");
    expect(origenPublico("localhost", "localhost:3300", null).href).toBe("http://localhost:3300/");
  });

  it("un Host con ruta, usuario o espacios no se usa para armar la dirección", () => {
    for (const raro of ["evil.com/ruta", "user@evil.com", "a b", "evil.com:999999"]) {
      expect(origenPublico(undefined, raro, "https").host).toBe("localhost:3000");
    }
  });

  it("un DOMAIN mal escrito tampoco", () => {
    expect(origenPublico("https://elapp.com.mx", "elapp.com.mx", "https").href).toBe("https://elapp.com.mx/");
  });
});
