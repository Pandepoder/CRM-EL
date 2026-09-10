/**
 * Credenciales del Administrador Maestro, la única cuenta real que crea `pnpm db:clean`.
 *
 * Vive en su propio módulo por dos razones. La primera es que clean-production.ts se
 * ejecuta al importarlo, así que sus guardas no serían comprobables desde una prueba. La
 * segunda es de orden: esto debe resolverse ANTES de abrir la transacción, no cien líneas
 * después del TRUNCATE.
 *
 * Antes la contraseña se resolvía así:
 *
 *   const adminPassword = process.env.ADMIN_PASSWORD || process.env.DEMO_PASSWORD;
 *
 * con una guarda que solo abortaba si faltaban LAS DOS. Como scripts/deploy-vps.py escribía
 * DEMO_PASSWORD en el `.env` del servidor y ejecutaba `pnpm db:clean` durante el despliegue,
 * un ADMIN_PASSWORD vacío —y la cadena vacía es falsy— creaba al administrador de producción
 * con la contraseña de demostración. En silencio, y en el script cuyo propósito declarado es
 * dejar la base lista para producción. DEMO_PASSWORD ya no existe, pero la guarda se queda:
 * el respaldo silencioso era el defecto, no la variable concreta.
 */

export type MasterAdminCredentials = {
  readonly email: string;
  readonly password: string;
};

export function resolveMasterAdminCredentials(): MasterAdminCredentials {
  const email = process.env.ADMIN_EMAIL?.trim();
  if (!email) {
    throw new Error(
      "ADMIN_EMAIL debe estar definida: la identidad del Administrador Maestro no puede " +
        "venir de un valor escrito en el código."
    );
  }

  // Sin respaldo, a propósito.
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD debe estar definida. Ya no se acepta DEMO_PASSWORD como respaldo: " +
        "eso le ponía al administrador real una contraseña de demostración."
    );
  }

  // La semilla ya no usa una contraseña compartida, pero SEED_USER_PASSWORD sigue
  // existiendo para fijarla cuando hace falta repetibilidad. Si alguien la reutiliza como
  // contraseña del administrador, vuelve el problema que motivó todo esto.
  const seedPassword = process.env.SEED_USER_PASSWORD?.trim();
  if (seedPassword && seedPassword === password) {
    throw new Error(
      "ADMIN_PASSWORD es idéntica a SEED_USER_PASSWORD. La contraseña de los usuarios " +
        "sembrados no puede ser la del administrador."
    );
  }

  return { email, password };
}
