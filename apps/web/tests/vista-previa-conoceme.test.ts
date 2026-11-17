import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "../middleware";

/**
 * WhatsApp y Facebook piden la imagen de la vista previa con su robot, sin sesión. Si el middleware la manda
 * al login, el enlace de Conóceme se comparte sin foto y nadie se entera: no hay error a la vista.
 */
describe("la vista previa de Conóceme al compartir", () => {
  it("la imagen se entrega sin sesión", async () => {
    const respuesta = await middleware(new NextRequest("https://elapp.com.mx/conoceme/opengraph-image?7603defe0d6b32af"));
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("location")).toBeNull();
  });

  it("y eso no abre el resto de lo que cuelga de /conoceme a quien no tiene sesión", async () => {
    // Para leer la cookie (que aquí no viene) el middleware necesita una llave cualquiera.
    process.env.SESSION_SECRET ??= "x".repeat(32);
    const respuesta = await middleware(new NextRequest("https://elapp.com.mx/conoceme/otra-cosa"));
    expect(respuesta.headers.get("location") ?? "").toContain("/login");
  });
});
