import { hasLocalMatch } from "next/dist/shared/lib/match-local-pattern";
import { describe, expect, it } from "vitest";

import { MARCA } from "@/lib/marca";

import nextConfig from "../next.config";

/**
 * El optimizador de imágenes (`/_next/image`) no pide sesión y sus fallas conocidas se disparan con una imagen
 * preparada a propósito: solo procesa las imágenes propias del sitio, nunca lo que sube la gente. Si la marca
 * cambia de carpeta, esta prueba avisa antes de que su foto deje de verse.
 */

const patrones = nextConfig.images?.localPatterns;
const admitida = (ruta: string) => hasLocalMatch(patrones, ruta);

describe("qué imágenes pasan por el optimizador", () => {
  it("las de la marca, sí", () => {
    const propias = [MARCA.retrato, MARCA.monograma.blanco, MARCA.monograma.color].filter((r): r is string => Boolean(r));
    expect(propias.length).toBeGreaterThan(0);
    for (const ruta of propias) expect(admitida(ruta), ruta).toBe(true);
  });

  it("lo que sube la gente y las rutas de la API, no", () => {
    for (const ruta of ["/uploads/foto.heic", "/api/uploads/foto.jpg", "/api/map/reports", "/brand/../uploads/foto.heic", "/foto.png"]) {
      expect(admitida(ruta), ruta).toBe(false);
    }
  });
});
