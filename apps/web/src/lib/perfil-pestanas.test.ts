import { describe, expect, it } from "vitest";

import AjustesRetirados from "../../app/(shell)/settings/page";

import { pestanaInicial } from "./perfil-pestanas";

describe("la pestaña con que abre el perfil (`?pestana=`)", () => {
  it("sin pedir nada, o con algo que no existe, la primera", () => {
    expect(pestanaInicial(undefined, true)).toBe("contactos");
    expect(pestanaInicial("ajustes", true)).toBe("contactos");
    expect(pestanaInicial("", false)).toBe("contactos");
  });

  it("la que se pide, si existe", () => {
    expect(pestanaInicial("agenda", false)).toBe("agenda");
    expect(pestanaInicial("territorio", true)).toBe("territorio");
    expect(pestanaInicial(["agenda", "territorio"], true)).toBe("agenda");
  });

  it("«Seguridad» solo en el perfil propio: en el de otra persona no existe", () => {
    expect(pestanaInicial("seguridad", true)).toBe("seguridad");
    expect(pestanaInicial("seguridad", false)).toBe("contactos");
  });
});

describe("/settings (Ajustes se retiró, D1)", () => {
  // Sin sesión, el middleware manda antes al login (`/settings` no es pública); eso se comprueba en el navegador.
  it("lleva a Mi perfil, en la pestaña Seguridad", () => {
    let destino = "";
    try {
      AjustesRetirados();
    } catch (error) {
      destino = String((error as { digest?: string }).digest);
    }
    expect(destino).toContain(";/perfil?pestana=seguridad;");
  });
});
