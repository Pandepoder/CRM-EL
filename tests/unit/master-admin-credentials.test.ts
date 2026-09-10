import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveMasterAdminCredentials } from "../../scripts/db/master-admin-credentials.js";

/**
 * El Administrador Maestro es la única cuenta real que crea `pnpm db:clean`, con rol
 * `admin` y por tanto con alcance total. Estas pruebas fijan que su contraseña no pueda
 * ser nunca la de demostración.
 *
 * El defecto que las motiva era una sola línea:
 *
 *   const adminPassword = process.env.ADMIN_PASSWORD || process.env.DEMO_PASSWORD;
 *
 * y una guarda que solo abortaba si faltaban las dos. `scripts/deploy-vps.py` escribía
 * DEMO_PASSWORD en el `.env` del servidor y ejecutaba `pnpm db:clean` en el despliegue, así
 * que bastaba un ADMIN_PASSWORD vacío para que el administrador de producción quedara con
 * una contraseña publicada en un repositorio público. `.env.production.example` incluso
 * documentaba ese respaldo como una comodidad.
 */
describe("credenciales del Administrador Maestro", () => {
  const entornoOriginal = { ...process.env };

  beforeEach(() => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.SEED_USER_PASSWORD;
  });

  afterEach(() => {
    process.env = { ...entornoOriginal };
  });

  it("no acepta ninguna otra variable como respaldo de ADMIN_PASSWORD", () => {
    process.env.ADMIN_EMAIL = "admin@ejemplo.invalid";
    process.env.SEED_USER_PASSWORD = "contrasena-de-los-fixtures";
    // ADMIN_PASSWORD ausente: antes esto seguía adelante usando la de demostración.

    expect(() => resolveMasterAdminCredentials()).toThrow(/ADMIN_PASSWORD/);
  });

  it("trata una ADMIN_PASSWORD vacía como ausente", () => {
    // La cadena vacía es falsy en JS, que es exactamente cómo se colaba el respaldo
    // cuando docker-compose pasaba ADMIN_PASSWORD=${ADMIN_PASSWORD} sin valor.
    process.env.ADMIN_EMAIL = "admin@ejemplo.invalid";
    process.env.ADMIN_PASSWORD = "   ";
    process.env.SEED_USER_PASSWORD = "contrasena-de-los-fixtures";

    expect(() => resolveMasterAdminCredentials()).toThrow(/ADMIN_PASSWORD/);
  });

  it("rechaza que ADMIN_PASSWORD coincida con SEED_USER_PASSWORD", () => {
    process.env.ADMIN_EMAIL = "admin@ejemplo.invalid";
    process.env.ADMIN_PASSWORD = "la-misma-de-siempre";
    process.env.SEED_USER_PASSWORD = "la-misma-de-siempre";

    expect(() => resolveMasterAdminCredentials()).toThrow(/SEED_USER_PASSWORD/);
  });

  it("exige ADMIN_EMAIL en vez de caer en un correo escrito en el código", () => {
    // Antes había un `|| "admin@tonala.gob.mx"`: la identidad del administrador real
    // dependía de un literal, y ese literal convivía con otros dos valores distintos
    // por omisión en docker-compose.yml y .env.production.example.
    process.env.ADMIN_PASSWORD = "una-contrasena-propia";

    expect(() => resolveMasterAdminCredentials()).toThrow(/ADMIN_EMAIL/);
  });

  it("devuelve las credenciales cuando la configuración es correcta", () => {
    process.env.ADMIN_EMAIL = "  admin@ejemplo.invalid  ";
    process.env.ADMIN_PASSWORD = "una-contrasena-propia";
    process.env.SEED_USER_PASSWORD = "otra-distinta";

    expect(resolveMasterAdminCredentials()).toEqual({
      email: "admin@ejemplo.invalid",
      password: "una-contrasena-propia"
    });
  });
});
