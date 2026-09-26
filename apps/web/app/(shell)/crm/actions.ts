"use server";

import { revalidatePath } from "next/cache";

import { actorFromSession } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { darDeBajaCiudadano } from "@/lib/baja-ciudadano";
import { esUuid } from "@/lib/ids";
import { registrarError } from "@/lib/registro";
import { veCiudadano } from "@/lib/contact-visibility";

// El alta de ciudadanos ya no es una acción de servidor: el formulario llama a `POST /api/crm/contacts`
// (ver `lib/alta-ciudadano.ts`). La acción lanzaba sus errores, y en producción Next los oculta y
// lleva a la pantalla de fallo: se perdía todo lo capturado. Una API, además, la puede reintentar la
// cola del teléfono.

/**
 * Dar de baja a un ciudadano desde el Directorio o el detalle de equipo. Solo administración.
 *
 * Antes esto borraba físicamente la ficha con una cascada a mano: irreversible, sin auditoría, y
 * fallaba con uno de cada seis ciudadanos (D10). Ahora es la misma baja lógica y auditada que
 * `DELETE /api/crm/contacts/[id]`: ver `darDeBajaCiudadano`.
 *
 * Devuelve el error en vez de lanzarlo: en producción Next sustituye el mensaje de lo que lanza
 * una acción por uno genérico, y la pantalla no podría decir qué pasó.
 */
export async function darDeBajaCiudadanoAction(contactId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await actorFromSession();
  if (!actor) return { ok: false, error: "Tu sesión terminó. Vuelve a entrar." };

  const scope = await resolveUserNetworkScope(actor.actorId);
  if (!scope.isAdmin) return { ok: false, error: "Solo administración puede dar de baja ciudadanos del padrón." };
  // Un administrador municipal, solo a los que ve: los de su municipio y los de su gente (etapa 6).
  if (!esUuid(contactId) || !(await veCiudadano(scope, contactId))) return { ok: false, error: "Ese ciudadano no existe." };

  try {
    if (!(await darDeBajaCiudadano(contactId, actor))) return { ok: false, error: "Ese ciudadano no existe." };
  } catch (error) {
    registrarError("Failed to deactivate contact", error);
    return { ok: false, error: "No se pudo dar de baja. Intenta de nuevo." };
  }

  revalidatePath("/crm");
  revalidatePath("/crm/contacts");
  revalidatePath("/resumen");
  revalidatePath("/mapa");
  return { ok: true };
}

