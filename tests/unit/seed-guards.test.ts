import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { seedDatabase } from "../../scripts/db/seeds.js";

/**
 * La semilla hace `ON CONFLICT (email) DO UPDATE SET password_hash`, así que sembrar sobre
 * una base que ya tenga usuarios con esos correos les cambia la contraseña. Estas pruebas
 * fijan que no pueda ocurrir contra un destino remoto sin confirmación explícita.
 *
 * Antes la única barrera era `NODE_ENV === "production"`, que está sin definir en CI y vale
 * "development" en el `.env` local: un `pnpm db:seed` con `DATABASE_URL` apuntando al
 * servidor la evadía por completo. Ahora decide `confirmDestructiveOperation`, que mira el
 * host de la URL y no una etiqueta de entorno — el mismo control que ya usaban `db:clean` y
 * `db:reset`.
 */

/**
 * Destino inalcanzable a propósito: la guarda corre antes de abrir la conexión, así que si
 * dejara de disparar la prueba fallaría por error de conexión en vez de pasar en silencio.
 */
const LOCAL_INALCANZABLE = "postgres://nadie:nada@127.0.0.1:1/no-existe";
const REMOTO = "postgres://usuario:clave@db.ejemplo.invalid:5432/tonala_os";

describe("guardas de la semilla", () => {
  const entornoOriginal = { ...process.env };

  beforeEach(() => {
    delete process.env.SEED_USER_PASSWORD;
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env = { ...entornoOriginal };
  });

  it("bloquea un destino remoto aunque NODE_ENV no diga producción", async () => {
    // Este es el caso que la guarda por etiqueta de entorno no cubría: DATABASE_URL
    // apuntando al servidor desde una máquina de desarrollo.
    await expect(seedDatabase(REMOTO)).rejects.toThrow(/no es local|CONFIRM_DB/);
  });

  it("deja pasar un destino local sin pedir confirmación", async () => {
    // Falla por conexión, no por la guarda: es lo que permite que las pruebas de
    // integración y el CI siembren contra localhost sin intervención.
    await expect(seedDatabase(LOCAL_INALCANZABLE)).rejects.not.toThrow(/no es local|CONFIRM_DB/);
  });

  it("no exige configurar ninguna contraseña", async () => {
    // La semilla genera una aleatoria por ejecución. Antes exigía DEMO_PASSWORD, que era un
    // secreto compartido presente en .env, CI, Dockerfile, docker-compose y el despliegue.
    await expect(seedDatabase(LOCAL_INALCANZABLE)).rejects.not.toThrow(/PASSWORD/);
  });
});
