/**
 * Contrasena de los usuarios que crea `pnpm db:seed`, para los scripts sueltos de esta
 * carpeta que entran por HTTP.
 *
 * La semilla genera una contrasena aleatoria distinta en cada ejecucion y la imprime al
 * terminar. Para usar estos scripts, siembra fijando SEED_USER_PASSWORD y exporta el mismo
 * valor aqui. No hay valor por defecto: antes existia una contrasena compartida escrita en
 * el repositorio, y era justamente el problema.
 */
export function seedUserPassword(): string {
  const password = process.env.SEED_USER_PASSWORD?.trim();
  if (!password) {
    throw new Error(
      "Falta SEED_USER_PASSWORD. Siembra con `SEED_USER_PASSWORD=... pnpm db:seed` y exporta " +
        "el mismo valor antes de ejecutar este script."
    );
  }
  return password;
}
