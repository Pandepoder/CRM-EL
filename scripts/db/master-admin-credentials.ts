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
 * con una guarda que solo abortaba si faltaban LAS DOS. Como scripts/deploy-vps.py
 * escribía DEMO_PASSWORD en el `.env` del servidor y ejecutaba `pnpm db:clean` durante el
 * despliegue, un ADMIN_PASSWORD vacío —y la cadena vacía es falsy— creaba al administrador
 * de producción con la contraseña de demostración. En silencio, y en el script cuyo
 * propósito declarado es dejar la base lista para producción.
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

  const demoPassword = process.env.DEMO_PASSWORD?.trim();
  if (demoPassword && demoPassword === password) {
    throw new Error(
      "ADMIN_PASSWORD es idéntica a DEMO_PASSWORD. La contraseña de demostración es de " +
        "conocimiento público: no puede ser la del administrador."
    );
  }

  return { email, password };
}
