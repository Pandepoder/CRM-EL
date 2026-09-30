"use server";

import { revalidatePath } from "next/cache";

import { actorFromSession } from "@/lib/api-helpers";
import {
  aprobarSolicitudDeCuenta,
  cambiarEstado,
  cerrarSesiones,
  crearCuenta,
  editarCuenta,
  eliminarCuentaSinDatos,
  rechazarSolicitudDeCuenta,
  restablecerContrasena,
  type Resultado
} from "@/lib/gobierno-de-cuentas";
import { esUuid } from "@/lib/ids";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

/**
 * Control de usuarios. Quién puede hacer qué sobre cada cuenta lo decide `gobierno-de-cuentas.ts`
 * (etapa 6): el maestro, todas menos la suya; un administrador municipal, la gente de su municipio que
 * no es administración; nadie más. Cada cambio queda auditado.
 *
 * Devuelven el resultado en vez de lanzar: en producción Next cambia el mensaje de lo que lanza una
 * acción por uno genérico, y la pantalla no podría decir qué pasó. Antes varias de estas lanzaban.
 */

type Respuesta = { ok: true; mensaje?: string } | { ok: false; error: string };

const SIN_SESION: Respuesta = { ok: false, error: "Tu sesión terminó. Vuelve a entrar." };

async function sesion() {
  const actor = await actorFromSession();
  if (!actor) return null;
  return { actor, alcance: await resolveUserNetworkScope(actor.actorId) };
}

function responder(resultado: Resultado): Respuesta {
  if (!resultado.ok) return { ok: false, error: resultado.error };
  revalidatePath("/admin-usuarios");
  revalidatePath("/administracion-municipal");
  return resultado.mensaje ? { ok: true, mensaje: resultado.mensaje } : { ok: true };
}

const texto = (valor: FormDataEntryValue | null): string => (typeof valor === "string" ? valor : "");

export async function createUserAction(formData: FormData): Promise<Respuesta> {
  const s = await sesion();
  if (!s) return SIN_SESION;
  const municipio = texto(formData.get("municipality")).trim();
  return responder(
    await crearCuenta(s.actor, s.alcance, {
      displayName: texto(formData.get("displayName")),
      email: texto(formData.get("email")),
      password: texto(formData.get("password")),
      roleId: texto(formData.get("roleId")),
      municipio: municipio || null,
      telefono: texto(formData.get("phone"))
    })
  );
}

export async function approveUserAction(formData: FormData): Promise<Respuesta> {
  const s = await sesion();
  if (!s) return SIN_SESION;
  const userId = formData.get("userId");
  const roleId = formData.get("roleId");
  if (!esUuid(userId) || !esUuid(roleId)) return { ok: false, error: "Datos de aprobación incompletos." };
  return responder(await aprobarSolicitudDeCuenta(s.actor, s.alcance, userId, roleId));
}

export async function rejectUserAction(userId: string): Promise<Respuesta> {
  const s = await sesion();
  if (!s) return SIN_SESION;
  if (!esUuid(userId)) return { ok: false, error: "Esa solicitud no existe." };
  return responder(await rechazarSolicitudDeCuenta(s.actor, s.alcance, userId));
}

export async function resetUserPasswordAction(formData: FormData): Promise<Respuesta> {
  const s = await sesion();
  if (!s) return SIN_SESION;
  const userId = formData.get("userId");
  if (!esUuid(userId)) return { ok: false, error: "Esa cuenta no existe." };
  return responder(await restablecerContrasena(s.actor, s.alcance, userId, texto(formData.get("newPassword"))));
}

export async function deactivateUserAction(userId: string): Promise<Respuesta> {
  const s = await sesion();
  if (!s) return SIN_SESION;
  if (!esUuid(userId)) return { ok: false, error: "Esa cuenta no existe." };
  return responder(await cambiarEstado(s.actor, s.alcance, userId, false));
}

export async function activateUserAction(userId: string): Promise<Respuesta> {
  const s = await sesion();
  if (!s) return SIN_SESION;
  if (!esUuid(userId)) return { ok: false, error: "Esa cuenta no existe." };
  return responder(await cambiarEstado(s.actor, s.alcance, userId, true));
}

export async function closeSessionsAction(userId: string): Promise<Respuesta> {
  const s = await sesion();
  if (!s) return SIN_SESION;
  if (!esUuid(userId)) return { ok: false, error: "Esa cuenta no existe." };
  return responder(await cerrarSesiones(s.actor, s.alcance, userId));
}

export async function deleteUserWithoutDataAction(userId: string): Promise<Respuesta> {
  const s = await sesion();
  if (!s) return SIN_SESION;
  if (!esUuid(userId)) return { ok: false, error: "Esa cuenta no existe." };
  return responder(await eliminarCuentaSinDatos(s.actor, s.alcance, userId));
}

/**
 * Nombre y, si el formulario lo manda, municipio (solo el maestro). Vacío = sin municipio (General):
 * con él se filtra la cartografía y se decide qué gobierna un administrador.
 */
export async function updateUserAction(formData: FormData): Promise<Respuesta> {
  const s = await sesion();
  if (!s) return SIN_SESION;
  const userId = formData.get("userId");
  if (!esUuid(userId)) return { ok: false, error: "Esa cuenta no existe." };
  const campo = formData.get("municipality");
  return responder(
    await editarCuenta(s.actor, s.alcance, userId, {
      displayName: texto(formData.get("displayName")),
      ...(campo !== null ? { municipio: texto(campo) } : {})
    })
  );
}
