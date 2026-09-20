import { NextResponse } from "next/server";
import { visibleContactIds } from "./contact-visibility";

import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

/**
 * ¿Puede esta persona tocar la ficha de este ciudadano?
 *
 * El listado y la ficha ya venían acotados por alcance de red, pero las rutas
 * que operan sobre un contacto por su identificador —sus visitas, sus notas, su
 * asignación, su territorio— no comprobaban nada más allá de tener sesión
 * abierta. Con el id a la vista, cualquiera podía leer el historial de visitas
 * de un ciudadano de otra brigada, añadirle notas o reasignarlo. Medido: un
 * capturista sin un solo registro a su nombre obtenía 200 al pedir las visitas
 * de un contacto ajeno, aunque su ficha le respondiera 404.
 *
 * El criterio es el mismo que gobierna el directorio y la ficha, para que las
 * tres superficies no puedan volver a contradecirse: el contacto es tuyo si lo
 * registró, lo refirió o lo atiende alguien de tu alcance, o si está asignado a
 * alguien de tu alcance. Administración lo ve todo.
 */
export async function puedeVerContacto(
  contactId: string,
  actorId: string,
  _roles: readonly string[]
): Promise<boolean> {
  const scope = await resolveUserNetworkScope(actorId);
  const ids = await visibleContactIds(scope, contactId);
  return ids === null || ids.includes(contactId);
}

/**
 * Devuelve `null` si puede seguir, o la respuesta a devolver si no.
 *
 * Se responde 404 y no 403 a propósito: confirmar que un identificador existe
 * pero pertenece a otra brigada ya es información sobre el trabajo ajeno.
 */
export async function exigirAccesoAContacto(
  contactId: string,
  actorId: string,
  roles: readonly string[]
): Promise<NextResponse | null> {
  if (await puedeVerContacto(contactId, actorId, roles)) return null;
  return NextResponse.json(
    { error: "Este ciudadano no pertenece a tu brigada." },
    { status: 404 }
  );
}
