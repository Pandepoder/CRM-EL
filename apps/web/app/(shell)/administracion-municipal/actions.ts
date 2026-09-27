"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { schema } from "@tonala/shared/database";

import { actorFromSession } from "@/lib/api-helpers";
import { getDatabaseClient } from "@/lib/db-client";
import { cambiarRol, editarCuenta, type Resultado } from "@/lib/gobierno-de-cuentas";
import { esUuid } from "@/lib/ids";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

/**
 * Acciones del panel «Administración por municipio». Las reglas son las de `gobierno-de-cuentas.ts`:
 * aquí solo se juntan en los dos pasos que el panel ofrece en un clic. Las demás (restablecer
 * contraseña, dar de baja, reactivar, cerrar sesiones, retirar el rol) son las de Control de usuarios.
 */

type Respuesta = { ok: true; mensaje?: string } | { ok: false; error: string };

async function maestro() {
  const actor = await actorFromSession();
  if (!actor) return null;
  const alcance = await resolveUserNetworkScope(actor.actorId);
  return alcance.isMaster ? { actor, alcance } : null;
}

const SOLO_MAESTRO: Respuesta = { ok: false, error: "Solo el administrador maestro gobierna la administración de los municipios." };

function responder(r: Resultado): Respuesta {
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/administracion-municipal");
  revalidatePath("/admin-usuarios");
  return r.mensaje ? { ok: true, mensaje: r.mensaje } : { ok: true };
}

/** Nombrar administradora de su municipio a una persona activa que ya es de él. */
export async function nombrarAdministradorAction(userId: string): Promise<Respuesta> {
  const s = await maestro();
  if (!s) return SOLO_MAESTRO;
  if (!esUuid(userId)) return { ok: false, error: "Elige a una persona de la lista." };
  const [rol] = await getDatabaseClient().select({ id: schema.roles.id }).from(schema.roles).where(eq(schema.roles.key, "admin")).limit(1);
  if (!rol) return { ok: false, error: "No existe el rol de administración." };
  return responder(await cambiarRol(s.actor, s.alcance, userId, rol.id));
}

/** Asignar o transferir el municipio de un administrador (o de cualquier cuenta). */
export async function asignarMunicipioAction(userId: string, municipio: string): Promise<Respuesta> {
  const s = await maestro();
  if (!s) return SOLO_MAESTRO;
  if (!esUuid(userId)) return { ok: false, error: "Esa cuenta no existe." };
  if (!municipio.trim()) return { ok: false, error: "Elige el municipio." };
  const [cuenta] = await getDatabaseClient()
    .select({ nombre: schema.userProfiles.displayName })
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.id, userId))
    .limit(1);
  if (!cuenta) return { ok: false, error: "Esa cuenta no existe." };
  return responder(await editarCuenta(s.actor, s.alcance, userId, { displayName: cuenta.nombre, municipio }));
}
