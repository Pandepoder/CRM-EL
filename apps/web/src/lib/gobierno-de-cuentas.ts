import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { type ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import { cuentaGobernada, idDeGeneral, municipioParaUnAdministrador, type CuentaGobernada } from "@/lib/alcance-municipal";
import { aceptarSolicitud, rechazarSolicitud } from "@/lib/admision";
import { hashPassword } from "@/lib/auth";
import { getDatabaseClient } from "@/lib/db-client";
import { buscarMunicipio } from "@/lib/municipios-jalisco";
import { type UserNetworkScope } from "@/lib/network-hierarchy";
import { generateUniquePersonalSlug } from "@/lib/personal-slug";

/**
 * Gobierno de cuentas (etapa 6): quién crea, aprueba, cambia de rol, da de baja o restablece a quién.
 * Una sola regla para Control de usuarios, el panel del administrador maestro y `/api/users/role`.
 *
 * - El administrador maestro gobierna todas las cuentas menos la suya: la suya se toca desde el
 *   servidor (`pnpm admin:rescatar`), para que un clic no deje al sistema sin maestro.
 * - Un administrador municipal gobierna a la gente de su municipio que no es administración, y solo
 *   por debajo de administración: **ningún administrador toca a otro** (A2). No cambia a nadie de
 *   municipio: eso es del maestro.
 * - Nadie más.
 *
 * Antes bastaba `roles.includes("admin")`: cualquier administrador creaba, degradaba o daba de baja a
 * otro, incluso al que lo creó, y nada quedaba auditado (A5). Ahora cada cambio deja su fila en
 * `audit_logs`, en la misma transacción. Las contraseñas nunca van a la auditoría.
 *
 * Cambiar rol, estado, contraseña o —si es administración— municipio sube `session_version` (disparador
 * de la 0023): las sesiones abiertas de esa cuenta dejan de valer en su siguiente petición (A8).
 */

export type Resultado = { ok: true; mensaje?: string } | { ok: false; error: string; status: number };

const NO_ES_TUYA: Resultado = {
  ok: false,
  status: 404,
  error: "Esa cuenta no está a tu cargo: la gobierna el administrador de su municipio o el administrador maestro."
};
const MINIMO_CONTRASENA = 6;

type Tx = Parameters<Parameters<ReturnType<typeof getDatabaseClient>["transaction"]>[0]>[0];

async function auditar(
  tx: Tx,
  actor: ActorContext,
  accion: string,
  personaId: string,
  antes: Record<string, unknown> | null,
  despues: Record<string, unknown>
) {
  await tx.insert(schema.auditLogs).values({
    actorUserId: actor.actorId,
    action: accion,
    entityType: "user_profile",
    entityId: personaId,
    correlationId: actor.correlationId,
    beforeData: antes,
    afterData: despues
  });
}

/** Las reglas de la 0023 hablan en la base; aquí se dicen en claro. */
function motivoDeLaBase(error: unknown): string | null {
  const e = error as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } } | null;
  const codigo = e?.code ?? e?.cause?.code;
  const regla = e?.constraint ?? e?.cause?.constraint;
  if (codigo === "23514" && regla === "user_profiles_administracion_con_municipio") {
    return "Un administrador municipal necesita municipio: asígnaselo antes (solo el administrador maestro cambia municipios).";
  }
  if (codigo === "23514" && (regla === "user_profiles_maestro_es_administracion" || regla === "user_profiles_maestro_en_general")) {
    return "El administrador maestro solo se cambia desde la consola del servidor.";
  }
  if (codigo === "23505") return "Ya existe una cuenta con ese correo.";
  return null;
}

async function conMotivo(trabajo: () => Promise<Resultado>): Promise<Resultado> {
  try {
    return await trabajo();
  } catch (error) {
    const motivo = motivoDeLaBase(error);
    if (motivo) return { ok: false, status: 409, error: motivo };
    throw error;
  }
}

async function rolPorId(roleId: string): Promise<{ id: string; key: string; name: string } | null> {
  const [rol] = await getDatabaseClient()
    .select({ id: schema.roles.id, key: schema.roles.key, name: schema.roles.name })
    .from(schema.roles)
    .where(eq(schema.roles.id, roleId))
    .limit(1);
  return rol ?? null;
}

/** ¿Puede este alcance dar este rol? Administración, solo el maestro. */
function puedeDarRol(alcance: UserNetworkScope, rolKey: string): boolean {
  if (!alcance.isAdmin) return false;
  if (rolKey === "admin") return alcance.isMaster;
  return alcance.isMaster || alcance.adminMunicipalityId !== null;
}

/** Los roles que ofrece la pantalla a este alcance: los mismos que acepta. */
export async function rolesQuePuedeDar(alcance: UserNetworkScope): Promise<Array<{ id: string; key: string; name: string }>> {
  const roles = await getDatabaseClient()
    .select({ id: schema.roles.id, key: schema.roles.key, name: schema.roles.name })
    .from(schema.roles)
    .orderBy(schema.roles.name);
  return roles.filter((r) => puedeDarRol(alcance, r.key));
}

async function gobernada(alcance: UserNetworkScope, userId: string): Promise<CuentaGobernada | null> {
  if (!alcance.isAdmin) return null;
  return cuentaGobernada(alcance, userId);
}

// ---------------------------------------------------------------------------------------------

export async function crearCuenta(
  actor: ActorContext,
  alcance: UserNetworkScope,
  datos: { displayName: string; email: string; password: string; roleId: string; municipio: string | null }
): Promise<Resultado> {
  if (!alcance.isAdmin) return { ok: false, status: 403, error: "No tienes permisos para crear usuarios." };
  const displayName = datos.displayName.trim();
  const email = datos.email.trim().toLowerCase();
  if (!displayName || !email || !datos.password || !datos.roleId) return { ok: false, status: 400, error: "Todos los campos son obligatorios." };
  if (datos.password.length < MINIMO_CONTRASENA) return { ok: false, status: 400, error: "La contraseña debe tener al menos 6 caracteres." };
  // Con un correo mal escrito la cuenta quedaba creada y nadie podía entrar con ella.
  if (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, status: 400, error: "Revisa el correo: no es válido." };
  if (displayName.length > 120) return { ok: false, status: 400, error: "El nombre puede tener hasta 120 caracteres." };

  const rol = await rolPorId(datos.roleId);
  if (!rol) return { ok: false, status: 400, error: "Ese rol no existe." };
  if (!puedeDarRol(alcance, rol.key)) {
    return { ok: false, status: 403, error: rol.key === "admin" ? "Solo el administrador maestro crea administradores." : "No puedes dar ese rol." };
  }

  // El municipio: el que se eligió, validado contra el catálogo; un administrador municipal da de alta
  // solo en el suyo.
  let municipio = datos.municipio ? (buscarMunicipio(datos.municipio)?.name ?? null) : null;
  if (datos.municipio && !municipio) return { ok: false, status: 400, error: `"${datos.municipio}" no es un municipio de Jalisco.` };
  if (!alcance.isMaster) {
    const propio = await municipioParaUnAdministrador(alcance, municipio);
    if (!propio.ok) return { ok: false, status: 403, error: propio.motivo };
    municipio = propio.nombre;
  }
  if (rol.key === "admin" && !municipio) return { ok: false, status: 400, error: "Un administrador municipal necesita municipio." };

  const db = getDatabaseClient();
  const [existente] = await db
    .select({ id: schema.userProfiles.id })
    .from(schema.userProfiles)
    .where(sql`lower(${schema.userProfiles.email}) = ${email}`)
    .limit(1);
  if (existente) return { ok: false, status: 409, error: "Ya existe un usuario registrado con este correo." };

  const passwordHash = await hashPassword(datos.password);
  const personalSlug = await generateUniquePersonalSlug(displayName);
  const id = randomUUID();
  return conMotivo(async () => {
    await db.transaction(async (tx) => {
      await tx.insert(schema.userProfiles).values({
        id,
        email,
        displayName,
        passwordHash,
        roleId: rol.id,
        personalSlug,
        municipality: municipio,
        ...(municipio ? { municipalityId: sql`(SELECT id FROM municipalities WHERE name = ${municipio} AND kind = 'municipio')` } : {}),
        status: "active",
        version: 1
      });
      await auditar(tx, actor, "user.create", id, null, { nombre: displayName, rol: rol.key, municipio: municipio ?? "General (estatal)" });
    });
    return { ok: true };
  });
}

export async function aprobarSolicitudDeCuenta(actor: ActorContext, alcance: UserNetworkScope, userId: string, roleId: string): Promise<Resultado> {
  const cuenta = await gobernada(alcance, userId);
  if (!cuenta) return NO_ES_TUYA;
  const rol = await rolPorId(roleId);
  if (!rol) return { ok: false, status: 400, error: "Ese rol no existe." };
  if (!puedeDarRol(alcance, rol.key)) {
    return { ok: false, status: 403, error: rol.key === "admin" ? "Solo el administrador maestro nombra administradores." : "No puedes dar ese rol." };
  }
  return conMotivo(async () =>
    (await aceptarSolicitud(userId, actor, { roleId: rol.id }))
      ? { ok: true }
      : { ok: false, status: 409, error: "Esa solicitud ya no está pendiente: alguien más la resolvió." }
  );
}

export async function rechazarSolicitudDeCuenta(actor: ActorContext, alcance: UserNetworkScope, userId: string): Promise<Resultado> {
  if (!(await gobernada(alcance, userId))) return NO_ES_TUYA;
  return (await rechazarSolicitud(userId, actor))
    ? { ok: true }
    : { ok: false, status: 409, error: "Esa solicitud ya no está pendiente: alguien más la resolvió." };
}

export async function cambiarRol(actor: ActorContext, alcance: UserNetworkScope, userId: string, roleId: string): Promise<Resultado> {
  const cuenta = await gobernada(alcance, userId);
  if (!cuenta) return NO_ES_TUYA;
  const rol = await rolPorId(roleId);
  if (!rol) return { ok: false, status: 400, error: "Ese rol no existe." };
  if (rol.key === cuenta.roleKey) return { ok: true };
  if (!puedeDarRol(alcance, rol.key)) {
    return { ok: false, status: 403, error: rol.key === "admin" ? "Solo el administrador maestro nombra administradores." : "No puedes dar ese rol." };
  }
  if (rol.key === "admin" && cuenta.municipioTipo !== "municipio" && cuenta.status === "active") {
    return { ok: false, status: 409, error: "Asígnale municipio antes de hacerla administradora: un administrador municipal gobierna uno." };
  }
  return conMotivo(async () => {
    await getDatabaseClient().transaction(async (tx) => {
      await tx.update(schema.userProfiles).set({ roleId: rol.id, updatedAt: new Date() }).where(eq(schema.userProfiles.id, userId));
      await auditar(tx, actor, "user.role_change", userId, { rol: cuenta.roleKey }, { rol: rol.key });
    });
    return { ok: true };
  });
}

export async function cambiarEstado(actor: ActorContext, alcance: UserNetworkScope, userId: string, activa: boolean): Promise<Resultado> {
  const cuenta = await gobernada(alcance, userId);
  if (!cuenta) return NO_ES_TUYA;
  const nuevo = activa ? "active" : "inactive";
  if (cuenta.status === nuevo) return { ok: true };
  if (activa && cuenta.roleKey === "admin" && cuenta.municipioTipo !== "municipio") {
    return { ok: false, status: 409, error: "Es un administrador sin municipio: asígnale uno antes de reactivarlo." };
  }
  return conMotivo(async () => {
    await getDatabaseClient().transaction(async (tx) => {
      await tx.update(schema.userProfiles).set({ status: nuevo, updatedAt: new Date() }).where(eq(schema.userProfiles.id, userId));
      await auditar(tx, actor, activa ? "user.activate" : "user.deactivate", userId, { estado: cuenta.status }, { estado: nuevo });
    });
    return { ok: true };
  });
}

export async function restablecerContrasena(actor: ActorContext, alcance: UserNetworkScope, userId: string, nueva: string): Promise<Resultado> {
  if (nueva.length < MINIMO_CONTRASENA) return { ok: false, status: 400, error: "La nueva contraseña debe tener al menos 6 caracteres." };
  if (!(await gobernada(alcance, userId))) return NO_ES_TUYA;
  const hash = await hashPassword(nueva);
  await getDatabaseClient().transaction(async (tx) => {
    await tx.update(schema.userProfiles).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(schema.userProfiles.id, userId));
    // Sin la contraseña, claro: solo que se restableció y que sus sesiones quedaron cerradas.
    await auditar(tx, actor, "user.password_reset", userId, null, { contrasena: "restablecida", sesiones: "cerradas" });
  });
  return { ok: true, mensaje: "Contraseña actualizada. Sus sesiones abiertas se cerraron." };
}

export async function cerrarSesiones(actor: ActorContext, alcance: UserNetworkScope, userId: string): Promise<Resultado> {
  if (!(await gobernada(alcance, userId))) return NO_ES_TUYA;
  await getDatabaseClient().transaction(async (tx) => {
    await tx
      .update(schema.userProfiles)
      .set({ sessionVersion: sql`${schema.userProfiles.sessionVersion} + 1` })
      .where(eq(schema.userProfiles.id, userId));
    await auditar(tx, actor, "user.sessions_closed", userId, null, { sesiones: "cerradas" });
  });
  return { ok: true, mensaje: "Sus sesiones abiertas se cerraron." };
}

/**
 * Nombre y, solo el maestro, municipio. `municipio`: `undefined` = no se toca; `null` = sin municipio
 * (General); un nombre = ese municipio del catálogo.
 */
export async function editarCuenta(
  actor: ActorContext,
  alcance: UserNetworkScope,
  userId: string,
  cambios: { displayName: string; municipio?: string | null }
): Promise<Resultado> {
  const cuenta = await gobernada(alcance, userId);
  if (!cuenta) return NO_ES_TUYA;
  const displayName = cambios.displayName.trim();
  if (!displayName) return { ok: false, status: 400, error: "El nombre no puede quedar vacío." };

  const cambiaMunicipio = cambios.municipio !== undefined;
  let municipio: string | null = null;
  if (cambiaMunicipio) {
    if (!alcance.isMaster) return { ok: false, status: 403, error: "Solo el administrador maestro cambia a alguien de municipio." };
    const texto = cambios.municipio?.trim() ?? "";
    municipio = texto ? (buscarMunicipio(texto)?.name ?? null) : null;
    if (texto && !municipio) return { ok: false, status: 400, error: `"${texto}" no es un municipio de Jalisco.` };
    if (!municipio && cuenta.roleKey === "admin" && cuenta.status === "active") {
      return { ok: false, status: 409, error: "Un administrador municipal activo no puede quedar sin municipio." };
    }
  }

  const general = await idDeGeneral();
  const [antes] = await getDatabaseClient()
    .select({ nombre: schema.userProfiles.displayName, municipio: schema.municipalities.name })
    .from(schema.userProfiles)
    .innerJoin(schema.municipalities, eq(schema.municipalities.id, schema.userProfiles.municipalityId))
    .where(eq(schema.userProfiles.id, userId))
    .limit(1);

  return conMotivo(async () => {
    await getDatabaseClient().transaction(async (tx) => {
      // La llave va con el texto: el elegido, o General si se deja sin municipio. Solo con el texto, la
      // base movería la llave al elegir uno pero no al vaciarlo (0022).
      await tx
        .update(schema.userProfiles)
        .set({
          displayName,
          ...(cambiaMunicipio
            ? {
                municipality: municipio,
                municipalityId: municipio ? sql`(SELECT id FROM municipalities WHERE name = ${municipio} AND kind = 'municipio')` : general
              }
            : {}),
          updatedAt: new Date()
        })
        .where(eq(schema.userProfiles.id, userId));
      if (antes && displayName !== antes.nombre) {
        await auditar(tx, actor, "user.rename", userId, { nombre: antes.nombre }, { nombre: displayName });
      }
      if (cambiaMunicipio && antes && (municipio ?? "General (estatal)") !== antes.municipio) {
        await auditar(tx, actor, "user.municipality_change", userId, { municipio: antes.municipio }, { municipio: municipio ?? "General (estatal)" });
      }
    });
    return { ok: true };
  });
}

/**
 * Eliminar una cuenta: solo el maestro, y solo si no tiene nada a su nombre (una cuenta creada por
 * error, un correo mal escrito). Con cualquier dato —un ciudadano, una visita, una fila de auditoría—
 * la base lo impide y se dice que se dé de baja: retirar a alguien nunca borra lo que registró.
 */
export async function eliminarCuentaSinDatos(actor: ActorContext, alcance: UserNetworkScope, userId: string): Promise<Resultado> {
  if (!alcance.isMaster) return { ok: false, status: 403, error: "Solo el administrador maestro elimina cuentas." };
  const cuenta = await gobernada(alcance, userId);
  if (!cuenta) return NO_ES_TUYA;
  try {
    const borrada = await getDatabaseClient().transaction(async (tx) => {
      const borradas = await tx
        .delete(schema.userProfiles)
        .where(and(eq(schema.userProfiles.id, userId), eq(schema.userProfiles.isMasterAdmin, false)))
        .returning({ id: schema.userProfiles.id });
      if (borradas.length === 0) return false;
      await auditar(tx, actor, "user.delete", userId, { nombre: cuenta.displayName, rol: cuenta.roleKey, estado: cuenta.status }, { eliminada: true });
      return true;
    });
    if (!borrada) return NO_ES_TUYA;
    return { ok: true, mensaje: `Se eliminó la cuenta de ${cuenta.displayName}.` };
  } catch (error) {
    const e = error as { code?: string; cause?: { code?: string } };
    if ((e.code ?? e.cause?.code) === "23503") {
      return { ok: false, status: 409, error: "Esa cuenta ya tiene datos a su nombre: no se elimina, se da de baja." };
    }
    throw error;
  }
}
