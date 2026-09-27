import { randomInt, randomUUID } from "node:crypto";

import argon2 from "argon2";
import type pg from "pg";

/**
 * Administración desde el servidor (etapa 6): nombrar al administrador maestro y rescatar el acceso
 * de administración cuando nadie puede hacerlo desde la aplicación.
 *
 * Lo usan `pnpm db:migrate` (nombra al maestro la primera vez) y `pnpm admin:rescatar`. Todo queda
 * en `audit_logs` sin autor: lo hizo quien tiene acceso al servidor, no una cuenta.
 */

type Consultor = pg.Pool | pg.PoolClient;

const ROL_ADMIN = "(SELECT id FROM roles WHERE key = 'admin')";

async function enTransaccion<T>(pool: pg.Pool, trabajo: (cliente: pg.PoolClient) => Promise<T>): Promise<T> {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const resultado = await trabajo(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

async function auditarDesdeLaConsola(
  cliente: Consultor,
  accion: string,
  personaId: string,
  antes: Record<string, unknown> | null,
  despues: Record<string, unknown>
): Promise<void> {
  await cliente.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data, correlation_id)
     VALUES (NULL, $1, 'user_profile', $2, $3, $4, $5)`,
    [accion, personaId, antes ? JSON.stringify(antes) : null, JSON.stringify(despues), `consola:${randomUUID()}`]
  );
}

type Cuenta = {
  id: string;
  display_name: string;
  status: string;
  role_key: string;
  is_master_admin: boolean;
  municipio: string;
  municipio_tipo: string;
};

async function cuentaPorCorreo(cliente: Consultor, correo: string): Promise<Cuenta | null> {
  const { rows } = await cliente.query<Cuenta>(
    `SELECT up.id, up.display_name, up.status, r.key AS role_key, up.is_master_admin, m.name AS municipio, m.kind AS municipio_tipo
     FROM user_profiles up
     JOIN roles r ON r.id = up.role_id
     JOIN municipalities m ON m.id = up.municipality_id
     WHERE lower(up.email) = lower($1)
     FOR UPDATE OF up`,
    [correo.trim()]
  );
  return rows[0] ?? null;
}

const describir = (c: Cuenta) => ({ rol: c.role_key, estado: c.status, maestro: c.is_master_admin, municipio: c.municipio });

// ---------------------------------------------------------------------------------------------
// Al migrar
// ---------------------------------------------------------------------------------------------

export type ResultadoDelMaestro =
  | { estado: "ya_habia"; nombre: string }
  | { estado: "nombrado"; nombre: string }
  | { estado: "sin_variable" }
  | { estado: "sin_cuenta" };

/**
 * Si todavía no hay administrador maestro, lo es la cuenta de ADMIN_EMAIL: la del «Administrador
 * Maestro» que crea `pnpm db:clean`, el único administrador que el sistema reconocía como tal. Solo si
 * ya es una cuenta de administración activa: esto no asciende a nadie, solo le pone la marca.
 */
export async function nombrarMaestroSiFalta(pool: pg.Pool, correo: string | undefined): Promise<ResultadoDelMaestro> {
  return enTransaccion(pool, async (cliente) => {
    // Un solo proceso a la vez: dos migraciones simultáneas no nombran a dos maestros (el índice único
    // lo impediría igual, pero con un error en vez de con calma).
    await cliente.query("SELECT pg_advisory_xact_lock(hashtext('nombrar-administrador-maestro'))");
    const { rows: [actual] } = await cliente.query<{ display_name: string }>(
      "SELECT display_name FROM user_profiles WHERE is_master_admin"
    );
    if (actual) return { estado: "ya_habia", nombre: actual.display_name };

    const limpio = correo?.trim();
    if (!limpio) return { estado: "sin_variable" };

    const cuenta = await cuentaPorCorreo(cliente, limpio);
    if (!cuenta || cuenta.status !== "active" || cuenta.role_key !== "admin") return { estado: "sin_cuenta" };

    await cliente.query(
      `UPDATE user_profiles SET is_master_admin = true, municipality = NULL, municipality_id = municipio_general(), updated_at = now()
       WHERE id = $1`,
      [cuenta.id]
    );
    await auditarDesdeLaConsola(cliente, "admin.master_named", cuenta.id, describir(cuenta), {
      maestro: true,
      municipio: "General (estatal)",
      origen: "pnpm db:migrate (ADMIN_EMAIL)"
    });
    return { estado: "nombrado", nombre: cuenta.display_name };
  });
}

export type EstadoDeAdministracion = {
  maestro: string | null;
  administradoresSinMunicipio: number;
  municipiosSinAdministracion: string[];
};

/**
 * Lo que `pnpm db:migrate` informa al terminar: quién es el maestro, cuántos administradores siguen
 * sin municipio (no ven nada hasta que el maestro se lo asigna) y qué municipios con gente activa no
 * tienen ningún administrador activo.
 */
export async function estadoDeAdministracion(cliente: Consultor): Promise<EstadoDeAdministracion> {
  const { rows: [maestro] } = await cliente.query<{ display_name: string }>(
    "SELECT display_name FROM user_profiles WHERE is_master_admin AND status = 'active'"
  );
  const { rows: [sinMunicipio] } = await cliente.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM user_profiles up JOIN roles r ON r.id = up.role_id
     WHERE r.key = 'admin' AND NOT up.is_master_admin AND up.status = 'active' AND up.municipality_id = municipio_general()`
  );
  const { rows: huerfanos } = await cliente.query<{ name: string }>(
    `SELECT m.name FROM municipalities m
     WHERE m.kind = 'municipio'
       AND EXISTS (SELECT 1 FROM user_profiles up WHERE up.municipality_id = m.id AND up.status = 'active')
       AND NOT EXISTS (
         SELECT 1 FROM user_profiles up JOIN roles r ON r.id = up.role_id
         WHERE up.municipality_id = m.id AND up.status = 'active' AND r.key = 'admin'
       )
     ORDER BY m.name`
  );
  return {
    maestro: maestro?.display_name ?? null,
    administradoresSinMunicipio: sinMunicipio?.n ?? 0,
    municipiosSinAdministracion: huerfanos.map((h) => h.name)
  };
}

// ---------------------------------------------------------------------------------------------
// Rescate
// ---------------------------------------------------------------------------------------------

export type OrdenDeRescate = {
  correo: string;
  /** Nombrarla administradora maestra. Si ya hay otra, hace falta `reemplazar`. */
  maestro?: boolean;
  /** Con `maestro`: la anterior pierde la marca y queda dada de baja. */
  reemplazar?: boolean;
  /** Nombrarla administradora de este municipio (nombre del catálogo, con o sin acentos). */
  municipio?: string;
  /** Reactivar la cuenta. */
  reactivar?: boolean;
  /** Ponerle una contraseña temporal nueva, que se muestra una sola vez. */
  contrasenaTemporal?: boolean;
  /** Cerrar todas sus sesiones abiertas. */
  cerrarSesiones?: boolean;
};

export type ResultadoDeRescate = {
  persona: string;
  hecho: string[];
  /** Solo si se pidió `contrasenaTemporal`. Se muestra una vez y no se guarda en ningún otro lado. */
  contrasena?: string;
};

export class ErrorDeRescate extends Error {}

/** 16 caracteres sin los que se confunden al dictarlos (0/O, 1/l/I), en cuatro grupos. */
function contrasenaAlAzar(): string {
  const alfabeto = "abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXYZ2346789";
  // `randomInt` reparte parejo; el resto de un byte favorecería a las primeras letras.
  let texto = "";
  for (let i = 0; i < 16; i++) texto += alfabeto[randomInt(alfabeto.length)];
  return texto.match(/.{4}/g)!.join("-");
}

export async function rescatar(pool: pg.Pool, orden: OrdenDeRescate): Promise<ResultadoDeRescate> {
  if (orden.maestro && orden.municipio) {
    throw new ErrorDeRescate("--maestro y --municipio se excluyen: el maestro no pertenece a un municipio.");
  }
  if (orden.reemplazar && !orden.maestro) throw new ErrorDeRescate("--reemplazar solo va con --maestro.");
  if (!orden.maestro && !orden.municipio && !orden.reactivar && !orden.contrasenaTemporal && !orden.cerrarSesiones) {
    throw new ErrorDeRescate("No se pidió nada: usa --maestro, --municipio, --reactivar, --contrasena-temporal o --cerrar-sesiones.");
  }

  return enTransaccion(pool, async (cliente) => {
    await cliente.query("SELECT pg_advisory_xact_lock(hashtext('nombrar-administrador-maestro'))");
    const cuenta = await cuentaPorCorreo(cliente, orden.correo);
    if (!cuenta) throw new ErrorDeRescate("No hay ninguna cuenta con ese correo.");
    const antes = describir(cuenta);
    const hecho: string[] = [];
    let contrasena: string | undefined;

    if (orden.maestro) {
      if (!cuenta.is_master_admin) {
        const { rows: [otro] } = await cliente.query<Cuenta>(
          `SELECT up.id, up.display_name, up.status, r.key AS role_key, up.is_master_admin, m.name AS municipio, m.kind AS municipio_tipo
           FROM user_profiles up JOIN roles r ON r.id = up.role_id JOIN municipalities m ON m.id = up.municipality_id
           WHERE up.is_master_admin FOR UPDATE OF up`
        );
        if (otro) {
          if (!orden.reemplazar) {
            throw new ErrorDeRescate(
              `Ya hay un administrador maestro (${otro.display_name}). Para cambiarlo, repite la orden con --reemplazar: ` +
                "esa cuenta perderá la marca y quedará dada de baja."
            );
          }
          await cliente.query(
            "UPDATE user_profiles SET is_master_admin = false, status = 'inactive', updated_at = now() WHERE id = $1",
            [otro.id]
          );
          await auditarDesdeLaConsola(cliente, "admin.master_replaced", otro.id, describir(otro), {
            maestro: false,
            estado: "inactive",
            reemplazadoPor: cuenta.id
          });
          hecho.push(`${otro.display_name} deja de ser el administrador maestro y queda dada de baja.`);
        }
      }
      await cliente.query(
        `UPDATE user_profiles SET role_id = ${ROL_ADMIN}, status = 'active', is_master_admin = true,
           municipality = NULL, municipality_id = municipio_general(), updated_at = now()
         WHERE id = $1`,
        [cuenta.id]
      );
      hecho.push("Es el administrador maestro: activa, con rol de administración y sin municipio (gobierna todo el estado).");
    }

    if (orden.municipio) {
      if (cuenta.is_master_admin) {
        throw new ErrorDeRescate("Esa cuenta es el administrador maestro. Nombra antes a otro maestro con --maestro --reemplazar.");
      }
      const { rows: [municipio] } = await cliente.query<{ id: string; name: string }>(
        "SELECT id, name FROM municipalities WHERE kind = 'municipio' AND clave = municipio_clave($1)",
        [orden.municipio]
      );
      if (!municipio) throw new ErrorDeRescate(`«${orden.municipio}» no es uno de los 125 municipios del catálogo.`);
      await cliente.query(
        `UPDATE user_profiles SET role_id = ${ROL_ADMIN}, status = 'active', municipality = $2, municipality_id = $3, updated_at = now()
         WHERE id = $1`,
        [cuenta.id, municipio.name, municipio.id]
      );
      hecho.push(`Es administradora de ${municipio.name}, activa.`);
    }

    if (orden.reactivar && !orden.maestro && !orden.municipio) {
      // La regla de la 0023 no deja activar a un administrador sin municipio: se dice en claro.
      if (cuenta.role_key === "admin" && !cuenta.is_master_admin && cuenta.municipio_tipo === "general") {
        throw new ErrorDeRescate("Es un administrador sin municipio: reactívalo con --municipio \"<municipio>\".");
      }
      await cliente.query("UPDATE user_profiles SET status = 'active', updated_at = now() WHERE id = $1", [cuenta.id]);
      hecho.push("Cuenta reactivada.");
    }

    if (orden.contrasenaTemporal) {
      contrasena = contrasenaAlAzar();
      const hash = await argon2.hash(contrasena, { type: argon2.argon2id });
      await cliente.query("UPDATE user_profiles SET password_hash = $2, updated_at = now() WHERE id = $1", [cuenta.id, hash]);
      hecho.push("Contraseña temporal puesta (se muestra abajo, una sola vez). Pídele que la cambie en su perfil al entrar.");
    }

    if (orden.cerrarSesiones || orden.contrasenaTemporal || orden.maestro || orden.municipio || orden.reactivar) {
      // Los cambios de rol, estado o contraseña ya la suben (disparador de la 0023); esto cubre el caso
      // de pedir solo cerrar sesiones y deja claro que ninguna sesión anterior sigue abierta.
      await cliente.query("UPDATE user_profiles SET session_version = session_version + 1 WHERE id = $1", [cuenta.id]);
      hecho.push("Sus sesiones abiertas quedan cerradas.");
    }

    const despues = await cuentaPorCorreo(cliente, orden.correo);
    await auditarDesdeLaConsola(cliente, "admin.console_rescue", cuenta.id, antes, {
      ...(despues ? describir(despues) : {}),
      ...(orden.contrasenaTemporal ? { contrasena: "temporal (no se guarda)" } : {}),
      ...(orden.cerrarSesiones ? { sesiones: "cerradas" } : {})
    });

    return { persona: cuenta.display_name, hecho, ...(contrasena ? { contrasena } : {}) };
  });
}
