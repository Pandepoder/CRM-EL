import path from "node:path";

import { config as cargarEnv } from "dotenv";
import type { NextConfig } from "next";

// `next dev` y `next build` corren con el directorio de trabajo en apps/web, y
// Next solo lee los .env de esa carpeta. El .env de la raiz del monorepo —el
// mismo que usan los scripts `pnpm db:*`— no llegaba nunca a la aplicacion: el
// servidor arrancaba, pero cada ruta respondia 500 con "Invalid environment
// configuration" y "SESSION_SECRET must be set with at least 32 characters",
// y la unica salida era mantener una copia duplicada en apps/web/.env.
//
// dotenv no pisa lo que ya este definido, asi que un apps/web/.env propio y las
// variables que docker compose inyecta al contenedor conservan la prioridad.
// Si el archivo no existe —el caso de la imagen de produccion— no hace nada.
cargarEnv({ path: path.resolve(process.cwd(), "..", "..", ".env") });

const isStandalone = process.env.BUILD_STANDALONE === "true" || process.platform !== "win32";

const nextConfig: NextConfig = {
  ...(isStandalone ? { output: "standalone" } : {}),
  transpilePackages: ["@tonala/ui", "@tonala/config"],
  experimental: {
    externalDir: true
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "X-XSS-Protection", value: "1; mode=block" }
        ]
      }
    ];
  },
  webpack(config: { resolve: { extensionAlias: Record<string, string[]> } }) {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"]
    };
    return config;
  }
};

export default nextConfig;
