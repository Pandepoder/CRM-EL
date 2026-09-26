import { and, count, eq, gte, or, sql } from "drizzle-orm";

import { schema } from "@tonala/shared/database";

import { contactIdRestriction, contactosVisibles } from "@/lib/contact-visibility";
import { condicionPorAutor } from "@/lib/alcance-municipal";
import { getDatabaseClient } from "@/lib/db-client";
import { incidentScopeCondition } from "@/lib/incident-visibility";
import { type UserNetworkScope } from "@/lib/network-hierarchy";

/**
 * Los números de cabecera de /resumen, en un solo sitio (M4).
 *
 * Había dos fuentes: la página hacía sus propias consultas, acotadas al alcance, y `/api/resumen`
 * devolvía totales de todo el sistema con otra lógica (otro módulo, otras reglas para contar
 * visitas) y solo a administración. Una misma pregunta —«¿cuántos ciudadanos llevamos?»— tenía dos
 * respuestas. Ahora las dos salen de aquí, con el mismo alcance.
 *
 * Qué cuenta cada número:
 * - ciudadanos: activos y visibles. «Hoy» y «PAN confirmado» también solo activos; antes contaban
 *   a los dados de baja, y podían salir más confirmados hoy que ciudadanos en total.
 * - actividades: visitas + incidencias del alcance. La visita que agendó una actividad no se cuenta
 *   aparte (la actividad ya cuenta), igual que en la bitácora.
 * - escucha social: lo que registró la gente del alcance más lo ligado a un ciudadano visible, como
 *   lo enseña su propia pantalla.
 */
export type KpisDelResumen = {
  totalContacts: number;
  todayContacts: number;
  panConfirmedContacts: number;
  totalActivities: number;
  todayActivities: number;
  totalSocialListening: number;
};

/** Las condiciones de alcance que usan los números y el tablero de /resumen. */
export async function restriccionesDelResumen(scope: UserNetworkScope) {
  const visibles = await contactosVisibles(scope);
  const contactos = and(eq(schema.contacts.status, "active"), contactIdRestriction(visibles));
  const sinVisitaVinculada = sql`NOT EXISTS (SELECT 1 FROM event_reports x WHERE x.visit_id = ${schema.visits.id})`;
  const visitas = and(contactIdRestriction(visibles, schema.visits.contactId), sinVisitaVinculada);
  const incidencias = incidentScopeCondition(scope);
  // Escucha: la de ciudadanos que ve y la que levantó su gente (o, si es administración municipal, la
  // de su municipio). El maestro, toda.
  const escucha =
    "todos" in visibles
      ? undefined
      : or(
          contactIdRestriction(visibles, schema.socialListening.contactId),
          condicionPorAutor(scope, schema.socialListening.municipalityId, schema.socialListening.createdByUserId)
        );
  return { contactos, visitas, incidencias, escucha };
}

export type RestriccionesDelResumen = Awaited<ReturnType<typeof restriccionesDelResumen>>;

/** `restricciones`, si ya se calcularon para el tablero: así el alcance se resuelve una sola vez. */
export async function kpisDelResumen(
  scope: UserNetworkScope,
  opciones: { restricciones?: RestriccionesDelResumen; ahora?: Date } = {}
): Promise<KpisDelResumen> {
  const db = getDatabaseClient();
  const r = opciones.restricciones ?? (await restriccionesDelResumen(scope));
  const ahora = opciones.ahora ?? new Date();
  const inicioDelDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

  const contar = async (consulta: Promise<Array<{ n: number }>>) => Number((await consulta)[0]?.n ?? 0);
  const [contactos, contactosHoy, confirmados, visitas, visitasHoy, incidencias, escucha] = await Promise.all([
    contar(db.select({ n: count() }).from(schema.contacts).where(r.contactos)),
    contar(db.select({ n: count() }).from(schema.contacts).where(and(r.contactos, gte(schema.contacts.createdAt, inicioDelDia)))),
    contar(db.select({ n: count() }).from(schema.contacts).where(and(r.contactos, eq(schema.contacts.panMilitancy, "confirmada")))),
    contar(db.select({ n: count() }).from(schema.visits).where(r.visitas)),
    contar(db.select({ n: count() }).from(schema.visits).where(and(r.visitas, gte(schema.visits.createdAt, inicioDelDia)))),
    contar(db.select({ n: count() }).from(schema.eventReports).where(r.incidencias)),
    contar(db.select({ n: count() }).from(schema.socialListening).where(r.escucha))
  ]);

  return {
    totalContacts: contactos,
    todayContacts: contactosHoy,
    panConfirmedContacts: confirmados,
    totalActivities: visitas + incidencias,
    todayActivities: visitasHoy,
    totalSocialListening: escucha
  };
}
