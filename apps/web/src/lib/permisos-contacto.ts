import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getDatabaseClient } from "@/lib/db-client";
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
  roles: readonly string[]
): Promise<boolean> {
  if (roles.includes("admin")) return true;

  const alcance = await resolveUserNetworkScope(actorId);
  if (alcance.isGlobal) return true;

  const enAlcance = alcance.allowedUserIds ?? [actorId];
  if (enAlcance.length === 0) return false;

  // `= ANY($1)` no sirve aquí: el arreglo de JavaScript no llega como arreglo de
  // Postgres y la consulta revienta con "op ANY/ALL requires array on right
  // side". Se enumeran los identificadores, igual que en el lector de contactos.
  const db = getDatabaseClient();
  const lista = sql.join(
    enAlcance.map((id) => sql`${id}`),
    sql`, `
  );
  const res = await db.execute<{ visible: number }>(sql`
    SELECT 1 AS visible
    FROM contacts c
    LEFT JOIN contact_assignments ca
      ON ca.contact_id = c.id AND ca.assignment_status = 'active'
    WHERE c.id = ${contactId}
      AND (
        c.created_by_user_id IN (${lista})
        OR c.referred_by_user_id IN (${lista})
        OR c.actual_contact_user_id IN (${lista})
        OR ca.assigned_user_id IN (${lista})
      )
    LIMIT 1
  `);
  return res.rows.length > 0;
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
