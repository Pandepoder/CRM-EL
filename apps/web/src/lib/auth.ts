import argon2 from "argon2";
import type pg from "pg";

export type AuthenticatedUser = Readonly<{
  id: string;
  email: string;
  displayName: string;
  roleKey: string;
  roleName: string;
}>;

export type AuthResult =
  | { success: true; user: AuthenticatedUser }
  | { success: false; reason: "invalid_credentials" | "pending_approval" | "inactive_account" };

type UserRow = {
  readonly id: string;
  readonly email: string;
  readonly display_name: string;
  readonly role_key: string;
  readonly role_name: string;
  readonly password_hash: string | null;
  readonly status: string;
};

/**
 * Busca un usuario por email y verifica su contraseña y estatus de cuenta.
 */
export async function authenticateUserDetailed(
  pool: pg.Pool,
  email: string,
  password: string
): Promise<AuthResult> {
  const normalized = email.trim().toLowerCase();

  const result = await pool.query<UserRow>(
    `
      SELECT
        user_profiles.id::text AS id,
        user_profiles.email,
        user_profiles.display_name,
        user_profiles.password_hash,
        user_profiles.status,
        roles.key  AS role_key,
        roles.name AS role_name
      FROM user_profiles
      INNER JOIN roles ON roles.id = user_profiles.role_id
      WHERE lower(user_profiles.email) = $1
      LIMIT 1
    `,
    [normalized]
  );

  const row = result.rows[0];

  if (!row?.password_hash) {
    await argon2.hash("dummy-timing-protection");
    return { success: false, reason: "invalid_credentials" };
  }

  const valid = await argon2.verify(row.password_hash, password);
  if (!valid) {
    return { success: false, reason: "invalid_credentials" };
  }

  if (row.status === "pending") {
    return { success: false, reason: "pending_approval" };
  }

  if (row.status !== "active") {
    return { success: false, reason: "inactive_account" };
  }

  return {
    success: true,
    user: {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      roleKey: row.role_key,
      roleName: row.role_name
    }
  };
}

/**
 * Retorna el usuario autenticado o null si las credenciales son inválidas o no está activo.
 */
export async function authenticateUser(
  pool: pg.Pool,
  email: string,
  password: string
): Promise<AuthenticatedUser | null> {
  const res = await authenticateUserDetailed(pool, email, password);
  return res.success ? res.user : null;
}

/**
 * Hashea una contraseña con argon2id (parámetros por defecto: seguros para producción).
 * Usar en scripts de seed y en el futuro endpoint de cambio de contraseña.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}
