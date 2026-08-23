import argon2 from "argon2";
import type pg from "pg";

export type AuthenticatedUser = Readonly<{
  id: string;
  email: string;
  displayName: string;
  roleKey: string;
  roleName: string;
}>;

type UserRow = {
  readonly id: string;
  readonly email: string;
  readonly display_name: string;
  readonly role_key: string;
  readonly role_name: string;
  readonly password_hash: string | null;
};

/**
 * Busca un usuario activo por email y verifica su contraseña con argon2id.
 * Retorna el usuario autenticado o null si las credenciales son inválidas.
 * El tiempo de respuesta es constante para emails no encontrados (protege contra timing attacks).
 */
export async function authenticateUser(
  pool: pg.Pool,
  email: string,
  password: string
): Promise<AuthenticatedUser | null> {
  const normalized = email.trim().toLowerCase();

  const result = await pool.query<UserRow>(
    `
      SELECT
        user_profiles.id::text AS id,
        user_profiles.email,
        user_profiles.display_name,
        user_profiles.password_hash,
        roles.key  AS role_key,
        roles.name AS role_name
      FROM user_profiles
      INNER JOIN roles ON roles.id = user_profiles.role_id
      WHERE lower(user_profiles.email) = $1
        AND user_profiles.status = 'active'
      LIMIT 1
    `,
    [normalized]
  );

  const row = result.rows[0];

  // Si no existe el usuario, igual hacemos una verificación dummy para evitar
  // timing attacks que revelen si el email existe en la BD.
  if (!row?.password_hash) {
    await argon2.hash("dummy-timing-protection");
    return null;
  }

  const valid = await argon2.verify(row.password_hash, password);
  if (!valid) return null;

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    roleKey: row.role_key,
    roleName: row.role_name
  };
}

/**
 * Hashea una contraseña con argon2id (parámetros por defecto: seguros para producción).
 * Usar en scripts de seed y en el futuro endpoint de cambio de contraseña.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}
