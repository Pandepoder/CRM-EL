"use server";

import { revalidatePath } from "next/cache";
import { schema } from "@tonala/shared/database";
const { teams, teamMembers } = schema;
import { actorFromSession } from "@/lib/api-helpers";
import { getDatabaseClient } from "@/lib/db-client";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { eq, and } from "drizzle-orm";
import { safeErrorMessage } from "@/lib/safe-error";
import { aceptarSolicitud, rechazarSolicitud } from "@/lib/admision";
import { esUuid } from "@/lib/ids";
import { puedeEditarEquipo } from "@/lib/permisos-equipos";

type Actor = { actorId: string; roles: readonly string[] };

/**
 * Integrantes y solicitudes del QR: administración o el líder de ESE equipo.
 *
 * Al pasar la gestión de equipos a "solo administración", las solicitudes de quien entra por el
 * QR de una brigada quedaban esperando a un admin y el líder no podía admitir a su propia gente.
 * El líder recupera eso para su equipo, y nada más: no toca equipos ajenos.
 */
async function assertCanManageMembers(actor: Actor | null | undefined, teamId: string) {
  if (!actor) throw new Error("No autenticado");
  const scope = await resolveUserNetworkScope(actor.actorId);
  // Administración, sobre los equipos que gobierna: el maestro, todos; un administrador municipal, los
  // de su municipio (etapa 6).
  if (scope.isAdmin) {
    if (!puedeEditarEquipo(scope, teamId)) throw new Error("Ese equipo no es de tu municipio.");
    return { scope, esAdmin: true };
  }

  const db = getDatabaseClient();
  const equipo = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!equipo || equipo.leaderId !== actor.actorId) {
    throw new Error("Solo administración o el líder de este equipo pueden gestionar sus integrantes");
  }
  return { scope, esAdmin: false };
}

/*
 * Crear, borrar y mover integrantes de equipos se hace por la API (`/api/admin/teams` y
 * `/api/admin/teams/[id]/members`), que es lo que usan las pantallas. Aquí había además
 * `createTeamAction`, `deleteTeamAction`, `addMemberAction` y `removeMemberAction`, que ninguna
 * pantalla llamaba y ya tenían reglas distintas de las de la API (M2): se retiraron.
 */

/**
 * Admisión de quien llegó por el QR de la brigada.
 *
 * Quien escanea queda apuntado al equipo desde el primer momento, pero con la
 * cuenta en `pending`: no puede entrar. Es deliberado, porque un enlace acaba
 * reenviado en cualquier grupo de WhatsApp y sin este paso bastaría tenerlo para
 * estar dentro de la estructura.
 *
 * Aceptar activa la cuenta —ya está en el equipo, nadie tiene que acordarse de
 * añadirla—. Rechazar la saca del equipo y deja la cuenta marcada, sin borrar a
 * la persona: si fue un error, un administrador puede revisarlo.
 */
export async function aceptarSolicitudAction(teamId: string, userId: string) {
  const actor = await actorFromSession();
  try {
    await assertCanManageMembers(actor, teamId);
  } catch (e) {
    // Los motivos de la guarda son textos pensados para el usuario, pero la guarda también consulta
    // la base: un fallo ahí devolvía al navegador la consulta SQL con sus valores.
    return { error: safeErrorMessage(e, "Sin permiso") };
  }

  if (!(await esIntegrante(teamId, userId))) return { error: "Esa persona no está en este equipo." };

  // Solo se activa a quien está esperando (ver `admision.ts`): el mismo flujo que Control de
  // Usuarios, sin tocar a nadie que administración haya dado de baja.
  if (!actor || !(await aceptarSolicitud(userId, actor))) return { error: "Esa solicitud ya no está pendiente." };

  revalidatePath(`/admin-equipos/${teamId}`);
  revalidatePath("/admin-equipos");
  return { success: true };
}

async function esIntegrante(teamId: string, userId: string): Promise<boolean> {
  if (!esUuid(teamId) || !esUuid(userId)) return false;
  const db = getDatabaseClient();
  const fila = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
  });
  return Boolean(fila);
}

export async function rechazarSolicitudAction(teamId: string, userId: string) {
  const actor = await actorFromSession();
  try {
    await assertCanManageMembers(actor, teamId);
  } catch (e) {
    // Los motivos de la guarda son textos pensados para el usuario, pero la guarda también consulta
    // la base: un fallo ahí devolvía al navegador la consulta SQL con sus valores.
    return { error: safeErrorMessage(e, "Sin permiso") };
  }

  // Solo quien pidió entrar a ESTE equipo. Antes no se comprobaba: con el id de cualquier cuenta
  // pendiente del sistema, el líder de un equipo la rechazaba aunque no tuviera nada que ver con él.
  if (!(await esIntegrante(teamId, userId))) return { error: "Esa persona no está en este equipo." };

  // Solo se rechaza a quien está esperando: una cuenta ya activa no se desactiva por aquí sin
  // querer. El rechazo y la salida del equipo van juntos (ver `admision.ts`).
  if (!actor || !(await rechazarSolicitud(userId, actor))) return { error: "Esa solicitud ya no está pendiente." };

  revalidatePath(`/admin-equipos/${teamId}`);
  revalidatePath("/admin-equipos");
  return { success: true };
}
