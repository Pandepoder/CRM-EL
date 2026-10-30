import { and, count, desc, eq, inArray, isNotNull, or, sql, type SQL } from "drizzle-orm";

import { decryptData, schema } from "@tonala/shared/database";

import { esDelMunicipio } from "./alcance-municipal";
import { contactIdRestriction, contactosVisibles } from "./contact-visibility";
import { getDatabaseClient } from "./db-client";
import { incidentScopeCondition } from "./incident-visibility";
import type { UserNetworkScope } from "./network-hierarchy";

/**
 * El perfil de una persona, liviano (plan de auditoría de menús, fase 6). Antes cargaba de golpe todos sus
 * ciudadanos —descifrando teléfono, domicilio y profesión de cada uno— y todas sus actividades: el perfil del
 * líder de prueba medía 1.3 MB. Ahora trae 20 ciudadanos y el total (el resto, en el Directorio con
 * `?registro=`), 30 actividades con el tipo real de la Agenda, y las colonias y secciones contadas en la base.
 */

/** Cuántos ciudadanos y actividades se enseñan en el perfil; el resto, en el Directorio y la Agenda. */
export const CIUDADANOS_EN_EL_PERFIL = 20;
export const ACTIVIDADES_EN_EL_PERFIL = 30;

const ESTADOS_HECHOS = ["completed", "resolved", "successful"];

/**
 * ¿Puede quien mira abrir el perfil de esta persona (y filtrar el Directorio por ella)? El maestro, a cualquiera;
 * un administrador municipal, a su gente aunque ya no esté activa; el resto, a su estructura. Cada quien, el suyo.
 */
export async function puedeVerPerfil(alcance: UserNetworkScope, personaId: string): Promise<boolean> {
  if (personaId === alcance.userId || alcance.isMaster) return true;
  if (alcance.teammateUserIds.includes(personaId)) return true;
  return alcance.adminMunicipalityId !== null && (await esDelMunicipio(personaId, alcance.adminMunicipalityId));
}

/** Los ciudadanos que registró (o refirió) una persona y que quien mira puede ver: la misma condición del Directorio. */
export async function condicionDeRegistradosPor(alcance: UserNetworkScope, personaId: string): Promise<SQL> {
  return and(
    eq(schema.contacts.status, "active"),
    or(eq(schema.contacts.createdByUserId, personaId), eq(schema.contacts.referredByUserId, personaId)),
    contactIdRestriction(await contactosVisibles(alcance))
  )!;
}

export type CiudadanoDelPerfil = {
  id: string;
  displayName: string;
  phone: string | null;
  colony: string | null;
  sectionNum: number | undefined;
  createdAt: string;
};

export type ActividadDelPerfil = {
  id: string;
  /** El tipo real: el de la Agenda, «Visita» o «Incidencia». Antes se adivinaba por el título. */
  tipo: string;
  title: string;
  description: string;
  location: string;
  status: string;
  hecha: boolean;
  scheduledAt: string;
};

export type ResumenDeActividades = { total: number; hechas: number; porTipo: Array<{ tipo: string; cantidad: number }> };

const iso = (d: Date | string | null | undefined) => (d instanceof Date ? d : new Date(d ?? Date.now())).toISOString();

export async function datosDelPerfil(alcance: UserNetworkScope, personaId: string) {
  const db = getDatabaseClient();
  const deLaPersona = await condicionDeRegistradosPor(alcance, personaId);

  // Ciudadanos: 20 y el total. Solo se descifran los 20 que se enseñan.
  const [[total], filas] = await Promise.all([
    db.select({ total: count() }).from(schema.contacts).where(deLaPersona),
    db
      .select({
        id: schema.contacts.id,
        displayName: schema.contacts.displayName,
        phone: schema.contacts.phone,
        colony: schema.contacts.colony,
        sectionNum: schema.electoralSections.sectionNum,
        createdAt: schema.contacts.createdAt
      })
      .from(schema.contacts)
      .leftJoin(schema.electoralSections, eq(schema.contacts.sectionId, schema.electoralSections.id))
      .where(deLaPersona)
      .orderBy(desc(schema.contacts.createdAt), desc(schema.contacts.id))
      .limit(CIUDADANOS_EN_EL_PERFIL)
  ]);
  const ciudadanos: CiudadanoDelPerfil[] = filas.map((c) => ({
    id: c.id,
    displayName: c.displayName,
    phone: decryptData(c.phone),
    colony: decryptData(c.colony),
    sectionNum: c.sectionNum ?? undefined,
    createdAt: iso(c.createdAt)
  }));

  // Colonias (por el territorio del ciudadano) y secciones (por su sección), contadas en la base sobre todos sus
  // ciudadanos visibles, no solo los 20 de la lista.
  const [colonias, secciones] = await Promise.all([
    db
      .select({ name: schema.colonies.name, count: sql<number>`count(*)::int` })
      .from(schema.contacts)
      .innerJoin(schema.contactTerritory, eq(schema.contactTerritory.contactId, schema.contacts.id))
      .innerJoin(schema.colonies, eq(schema.colonies.id, schema.contactTerritory.colonyId))
      .where(deLaPersona)
      .groupBy(schema.colonies.name)
      .orderBy(sql`count(*) DESC`, schema.colonies.name)
      .limit(8),
    db
      .select({ numero: schema.electoralSections.sectionNum, count: sql<number>`count(*)::int` })
      .from(schema.contacts)
      .innerJoin(schema.electoralSections, eq(schema.electoralSections.id, schema.contacts.sectionId))
      .where(and(deLaPersona, isNotNull(schema.contacts.sectionId)))
      .groupBy(schema.electoralSections.sectionNum)
      .orderBy(sql`count(*) DESC`, schema.electoralSections.sectionNum)
      .limit(8)
  ]);

  // Actividades: la Agenda y las incidencias (la regla de siempre, `incidentScopeCondition`) y las visitas a
  // ciudadanos que quien mira ve. 30 de las más recientes; los totales, contados en la base.
  const deEventos = and(
    or(eq(schema.eventReports.assignedToUserId, personaId), eq(schema.eventReports.createdByUserId, personaId)),
    incidentScopeCondition(alcance)
  );
  const restriccionCiudadanos = contactIdRestriction(await contactosVisibles(alcance));
  const deVisitas = and(
    or(eq(schema.visits.assignedUserId, personaId), eq(schema.visits.createdByUserId, personaId)),
    restriccionCiudadanos ? sql`${schema.visits.contactId} IN (SELECT ${schema.contacts.id} FROM ${schema.contacts} WHERE ${restriccionCiudadanos})` : undefined,
    // La visita que agendó una actividad ya sale como parte de la actividad: no se lista dos veces.
    sql`NOT EXISTS (SELECT 1 FROM event_reports x WHERE x.visit_id = ${schema.visits.id})`
  );
  const tipoDeEvento = sql<string>`coalesce(${schema.activityCatalogOptions.name}, CASE WHEN ${schema.eventReports.activityTypeId} IS NULL THEN 'Incidencia' ELSE 'Actividad' END)`;

  const [eventos, visitas, porTipoEventos, [conteoVisitas]] = await Promise.all([
    db
      .select({
        id: schema.eventReports.id,
        tipo: tipoDeEvento,
        title: schema.eventReports.title,
        description: schema.eventReports.description,
        status: schema.eventReports.status,
        eventDate: schema.eventReports.eventDate,
        municipality: schema.eventReports.municipality,
        sectionNum: schema.electoralSections.sectionNum
      })
      .from(schema.eventReports)
      .leftJoin(schema.electoralSections, eq(schema.eventReports.sectionId, schema.electoralSections.id))
      .leftJoin(schema.activityCatalogOptions, eq(schema.activityCatalogOptions.id, schema.eventReports.activityTypeId))
      .where(deEventos)
      .orderBy(desc(schema.eventReports.eventDate), desc(schema.eventReports.id))
      .limit(ACTIVIDADES_EN_EL_PERFIL),
    db
      .select({
        id: schema.visits.id,
        status: schema.visits.status,
        scheduledAt: schema.visits.scheduledAt,
        location: schema.visits.visitLocationText,
        contactName: schema.contacts.displayName
      })
      .from(schema.visits)
      .innerJoin(schema.contacts, eq(schema.visits.contactId, schema.contacts.id))
      .where(deVisitas)
      .orderBy(desc(schema.visits.scheduledAt), desc(schema.visits.id))
      .limit(ACTIVIDADES_EN_EL_PERFIL),
    db
      .select({
        tipo: tipoDeEvento,
        cantidad: sql<number>`count(*)::int`,
        hechas: sql<number>`count(*) FILTER (WHERE ${inArray(schema.eventReports.status, ESTADOS_HECHOS)})::int`
      })
      .from(schema.eventReports)
      .leftJoin(schema.activityCatalogOptions, eq(schema.activityCatalogOptions.id, schema.eventReports.activityTypeId))
      .where(deEventos)
      .groupBy(tipoDeEvento),
    db
      .select({ cantidad: count(), hechas: sql<number>`count(*) FILTER (WHERE ${inArray(schema.visits.status, ESTADOS_HECHOS)})::int` })
      .from(schema.visits)
      .where(deVisitas)
  ]);

  const actividades: ActividadDelPerfil[] = [
    ...visitas.map((v) => ({
      id: v.id,
      tipo: "Visita",
      title: `Visita a ${v.contactName}`,
      description: "",
      location: v.location || "Domicilio",
      status: v.status,
      hecha: ESTADOS_HECHOS.includes(v.status),
      scheduledAt: iso(v.scheduledAt)
    })),
    ...eventos.map((e) => ({
      id: e.id,
      tipo: e.tipo,
      title: e.title,
      description: e.description || "",
      location: e.sectionNum ? `Sección ${e.sectionNum}${e.municipality ? ` · ${e.municipality}` : ""}` : e.municipality || "Sin ubicación",
      status: e.status,
      hecha: ESTADOS_HECHOS.includes(e.status),
      scheduledAt: iso(e.eventDate)
    }))
  ]
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
    .slice(0, ACTIVIDADES_EN_EL_PERFIL);

  const visitasTotal = Number(conteoVisitas?.cantidad ?? 0);
  const porTipo = [...porTipoEventos.map((t) => ({ tipo: t.tipo, cantidad: Number(t.cantidad) })), ...(visitasTotal ? [{ tipo: "Visita", cantidad: visitasTotal }] : [])].sort(
    (a, b) => b.cantidad - a.cantidad || a.tipo.localeCompare(b.tipo, "es")
  );
  const resumenActividades: ResumenDeActividades = {
    total: porTipo.reduce((s, t) => s + t.cantidad, 0),
    hechas: porTipoEventos.reduce((s, t) => s + Number(t.hechas), 0) + Number(conteoVisitas?.hechas ?? 0),
    porTipo
  };

  return {
    ciudadanos,
    totalCiudadanos: Number(total?.total ?? 0),
    colonias: colonias.map((c) => ({ name: c.name, count: Number(c.count) })),
    secciones: secciones.map((s) => ({ name: `Sección ${s.numero}`, count: Number(s.count) })),
    actividades,
    resumenActividades
  };
}
