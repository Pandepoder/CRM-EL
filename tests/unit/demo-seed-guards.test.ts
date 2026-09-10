import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { seedDatabase } from "../../scripts/db/seeds.js";

/**
 * Las guardas de seedDatabase corren antes de abrir la conexion, asi que esta URL
 * apunta a propósito a un destino inexistente: si una guarda dejara de disparar,
 * la prueba fallaria por error de conexion en lugar de pasar en silencio.
 */
const URL_INALCANZABLE = "postgres://nadie:nada@127.0.0.1:1/no-existe";

describe("guardas de la semilla de demostración", () => {
  const entornoOriginal = { ...process.env };

  beforeEach(() => {
    delete process.env.DEMO_PASSWORD;
    delete process.env.ALLOW_DEMO_SEED;
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env = { ...entornoOriginal };
  });

  it("se niega a sembrar si no hay DEMO_PASSWORD", async () => {
    await expect(seedDatabase(URL_INALCANZABLE)).rejects.toThrow(/DEMO_PASSWORD/);
  });

  it("se niega a sembrar contra un entorno marcado como producción", async () => {
    // demoUserSeeds incluye correos de dominios reales y el upsert reescribe
    // password_hash: sembrar en producción le cambia la contraseña al admin real.
    process.env.DEMO_PASSWORD = "una-contrasena-de-prueba";
    process.env.NODE_ENV = "production";

    await expect(seedDatabase(URL_INALCANZABLE)).rejects.toThrow(/production/);
  });

  it("bloquea un destino remoto aunque NODE_ENV no diga producción", async () => {
    // Este es el caso que la guarda de NODE_ENV no cubría y que motivó añadir la segunda
    // barrera: DATABASE_URL apuntando al servidor desde una máquina de desarrollo, donde
    // NODE_ENV vale "development" o no está definida.
    process.env.DEMO_PASSWORD = "una-contrasena-de-prueba";
    process.env.NODE_ENV = "development";

    await expect(
      seedDatabase("postgres://usuario:clave@db.ejemplo.invalid:5432/tonala_os")
    ).rejects.toThrow(/no es local|CONFIRM_DB/);
  });

  it("permite el override explícito para un entorno mal etiquetado", async () => {
    process.env.DEMO_PASSWORD = "una-contrasena-de-prueba";
    process.env.NODE_ENV = "production";
    process.env.ALLOW_DEMO_SEED = "true";

    // Ya no lo bloquea la guarda: llega a intentar la conexión y falla por eso.
    await expect(seedDatabase(URL_INALCANZABLE)).rejects.not.toThrow(/production/);
  });
});
