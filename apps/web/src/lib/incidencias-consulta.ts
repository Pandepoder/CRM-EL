import { and, asc, count, desc, eq, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { patronDeBusqueda, schema, sinAcentosSql } from "@tonala/shared/database";

import { getDatabaseClient } from "./db-client";
import { ESTADOS_ABIERTOS, ESTADOS_CERRADOS } from "./estados-incidencia";
import { incidenciasQuePuedeTrabajar, incidentScopeCondition } from "./incident-visibility";
import { diasEntre, POR_PAGINA_INCIDENCIAS, type FiltrosDeIncidencias, type VistaDeIncidencias } from "./incidencias-filtros";
import type { UserNetworkScope } from "./network-hierarchy";

export type { VistaDeIncidencias } from "./incidencias-filtros";

/**
 * Qué es una incidencia en las pantallas de incidencias, y la consulta de la pantalla única de Incidencias
 * (plan de auditoría de menús, F1.1 y fase 2).
 *
 * Las actividades de la Agenda comparten la tabla `event_reports` (las distingue `activity_type_id`).
 * Incidencias e Historial ya las sacaban, cada una con su propia condición; «Todos los reportes» no, y
 * enseñaba «[Brigada de Campo] … Actividad de agenda» como si fuera un bache (A1). Con una sola función, las
 * vistas no pueden volver a decir cosas distintas.
 */

/**
 * Los estados cerrados de una incidencia. `cancelada` es solo de la Agenda (una actividad se cancela con
 * motivo desde allí): en las pantallas de incidencias contaba siempre 0.
 */
export const ESTADOS_CERRADOS_DE_INCIDENCIA = ESTADOS_CERRADOS.filter((e) => e !== "cancelada");

const ESTADOS_DE_LA_VISTA: Record<VistaDeIncidencias, readonly string[] | null> = {
  atender: ESTADOS_ABIERTOS,
  cerradas: ESTADOS_CERRADOS_DE_INCIDENCIA,
  todas: null
};

/** Incidencias (nunca actividades) que ve este alcance, en esta vista. */
export function condicionDeIncidencias(alcance: UserNetworkScope, vista: VistaDeIncidencias): SQL | undefined {
  const estados = ESTADOS_DE_LA_VISTA[vista];
  return and(
    isNull(schema.eventReports.activityTypeId),
    estados ? inArray(schema.eventReports.status, [...estados]) : undefined,
    incidentScopeCondition(alcance)
  );
}

/** Una incidencia como la ve la pantalla. Los nombres ya vienen recortados al alcance de quien mira. */
export type FilaDeIncidencia = {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  estado: string;
  creada: string;
  cerrada: string | null;
  /** Días de calendario abierta (o hasta que se cerró), en hora de Jalisco. */
  dias: number;
  seccion: number | null;
  municipio: string | null;
  municipioEsGeneral: boolean;
  lugar: string | null;
  latitud: number | null;
  longitud: number | null;
  fotos: string[];
  /** `null`: la persona no está en el alcance de quien mira («Otra estructura»). */
  reporto: string | null;
  /** Quien avisó es capturista o brigadista: es un aviso de campo (D9). */
  esAvisoDeCampo: boolean;
  atiendeEquipo: string | null;
  /** Hay equipo, pero no es de quien mira. */
  atiendeEquipoAjeno: boolean;
  atiendePersona: string | null;
  atiendePersonaAjena: boolean;
  asignadaAId: string | null;
  asignadaAEquipoId: string | null;
  sinAsignar: boolean;
  puedeTrabajar: boolean;
};

export type IndicadoresDeIncidencias = {
  abiertas: number;
  porAceptar: number;
  sinAsignar: number;
  masDeSieteDias: number;
  sinSeccion: number;
  mias: number;
};

export type ResultadoDeIncidencias = {
  filas: FilaDeIncidencia[];
  total: number;
  pagina: number;
  totalPaginas: number;
  indicadores: IndicadoresDeIncidencias;
};

const ROLES_QUE_AVISAN = ["capturist", "visit_responsible"];

export async function consultarIncidencias(alcance: UserNetworkScope, f: FiltrosDeIncidencias, ahora: Date = new Date()): Promise<ResultadoDeIncidencias> {
  const db = getDatabaseClient();
  const er = schema.eventReports;
  const visibles = new Set(alcance.allowedUserIds ?? []);
  const personaVisible = (id: string | null) => Boolean(id) && (alcance.isMaster || visibles.has(id!));
  const equipoVisible = (id: string | null) => Boolean(id) && (alcance.isMaster || alcance.teamIds.includes(id!));

  // Un responsable que no es del alcance se ignora sin decir nada: no confirma que exista.
  let porResponsable: SQL | undefined;
  if (f.responsable === "mias") porResponsable = eq(er.assignedToUserId, alcance.userId);
  else if (f.responsable === "sin") porResponsable = and(isNull(er.assignedToUserId), isNull(er.assignedTeamId));
  else if (f.responsable && personaVisible(f.responsable)) porResponsable = eq(er.assignedToUserId, f.responsable);

  const texto = f.q.trim();
  const busqueda = texto
    ? or(
        sql`${sinAcentosSql(er.title)} LIKE ${patronDeBusqueda(texto)}`,
        sql`${sinAcentosSql(er.description)} LIKE ${patronDeBusqueda(texto)}`,
        sql`${sinAcentosSql(sql`coalesce(${er.locationText}, '')`)} LIKE ${patronDeBusqueda(texto)}`
      )
    : undefined;

  const condicion = and(
    condicionDeIncidencias(alcance, f.vista),
    f.categoria ? eq(er.category, f.categoria) : undefined,
    f.seccion ? sql`${er.sectionId} IN (SELECT es.id FROM electoral_sections es WHERE es.section_num = ${f.seccion})` : undefined,
    porResponsable,
    f.antiguedad ? lt(er.createdAt, new Date(ahora.getTime() - f.antiguedad * 86_400_000)) : undefined,
    f.porAceptar ? eq(er.status, "pendiente") : undefined,
    f.sinSeccion ? isNull(er.sectionId) : undefined,
    busqueda
  );

  const trabajable = incidenciasQuePuedeTrabajar(alcance);
  const puedeTrabajar = sql<boolean>`coalesce((${trabajable ?? sql`true`}), false)`;
  const abiertas = condicionDeIncidencias(alcance, "atender");
  const hace7 = new Date(ahora.getTime() - 7 * 86_400_000);

  const [conteo, indicadores] = await Promise.all([
    db.select({ total: count() }).from(er).where(condicion),
    db
      .select({
        abiertas: count(),
        porAceptar: sql<number>`count(*) FILTER (WHERE ${er.status} = 'pendiente' AND ${puedeTrabajar})`,
        sinAsignar: sql<number>`count(*) FILTER (WHERE ${er.assignedToUserId} IS NULL AND ${er.assignedTeamId} IS NULL)`,
        masDeSieteDias: sql<number>`count(*) FILTER (WHERE ${er.createdAt} < ${hace7})`,
        sinSeccion: sql<number>`count(*) FILTER (WHERE ${er.sectionId} IS NULL)`,
        mias: sql<number>`count(*) FILTER (WHERE ${er.assignedToUserId} = ${alcance.userId})`
      })
      .from(er)
      .where(abiertas)
  ]);
  const total = conteo[0]?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA_INCIDENCIAS));
  // Una página que ya no existe (se cerraron incidencias, cambió un filtro) cae en la última con contenido.
  const pagina = Math.min(f.pagina, totalPaginas);

  const creador = alias(schema.userProfiles, "creador");
  const rolDelCreador = alias(schema.roles, "rol_del_creador");
  const asignada = alias(schema.userProfiles, "asignada");

  const orden =
    f.vista === "atender"
      ? [desc(sql`(${er.status} = 'pendiente')`), asc(er.createdAt), asc(er.id)]
      : f.vista === "cerradas"
        ? [desc(sql`coalesce(${er.closedAt}, ${er.updatedAt})`), desc(er.id)]
        : [desc(er.createdAt), desc(er.id)];

  const filas = await db
    .select({
      id: er.id,
      titulo: er.title,
      descripcion: er.description,
      categoria: er.category,
      estado: er.status,
      creada: er.createdAt,
      cerrada: er.closedAt,
      seccion: schema.electoralSections.sectionNum,
      municipio: schema.municipalities.name,
      municipioTipo: schema.municipalities.kind,
      lugar: er.locationText,
      latitud: er.latitude,
      longitud: er.longitude,
      fotos: er.mediaUrls,
      creadorId: er.createdByUserId,
      creadorNombre: creador.displayName,
      creadorRol: rolDelCreador.key,
      asignadaAId: er.assignedToUserId,
      asignadaNombre: asignada.displayName,
      equipoId: er.assignedTeamId,
      equipoNombre: schema.teams.name,
      puedeTrabajar
    })
    .from(er)
    .leftJoin(schema.electoralSections, eq(er.sectionId, schema.electoralSections.id))
    .leftJoin(schema.municipalities, eq(er.municipalityId, schema.municipalities.id))
    .leftJoin(creador, eq(er.createdByUserId, creador.id))
    .leftJoin(rolDelCreador, eq(creador.roleId, rolDelCreador.id))
    .leftJoin(asignada, eq(er.assignedToUserId, asignada.id))
    .leftJoin(schema.teams, eq(er.assignedTeamId, schema.teams.id))
    .where(condicion)
    .orderBy(...orden)
    .limit(POR_PAGINA_INCIDENCIAS)
    .offset((pagina - 1) * POR_PAGINA_INCIDENCIAS);

  return {
    filas: filas.map((r) => {
      const cerrada = r.cerrada ?? null;
      const reportoVisible = personaVisible(r.creadorId);
      const personaVisibleAsignada = personaVisible(r.asignadaAId);
      const equipoVisibleAsignado = equipoVisible(r.equipoId);
      return {
        id: r.id,
        titulo: r.titulo,
        descripcion: r.descripcion,
        categoria: r.categoria,
        estado: r.estado,
        creada: r.creada.toISOString(),
        cerrada: cerrada ? cerrada.toISOString() : null,
        dias: diasEntre(r.creada, cerrada ?? ahora),
        seccion: r.seccion ?? null,
        municipio: r.municipio ?? null,
        municipioEsGeneral: r.municipioTipo === "general",
        lugar: r.lugar ?? null,
        latitud: r.latitud === null || r.latitud === undefined ? null : Number(r.latitud),
        longitud: r.longitud === null || r.longitud === undefined ? null : Number(r.longitud),
        fotos: Array.isArray(r.fotos) ? (r.fotos as string[]) : [],
        // Los nombres se recortan aquí, en el servidor: a quien no puede ver a una persona no le llega.
        reporto: reportoVisible ? r.creadorNombre ?? null : null,
        esAvisoDeCampo: ROLES_QUE_AVISAN.includes(r.creadorRol ?? ""),
        atiendeEquipo: equipoVisibleAsignado ? r.equipoNombre ?? null : null,
        atiendeEquipoAjeno: Boolean(r.equipoId) && !equipoVisibleAsignado,
        atiendePersona: personaVisibleAsignada ? r.asignadaNombre ?? null : null,
        atiendePersonaAjena: Boolean(r.asignadaAId) && !personaVisibleAsignada,
        asignadaAId: personaVisibleAsignada ? r.asignadaAId : null,
        asignadaAEquipoId: equipoVisibleAsignado ? r.equipoId : null,
        sinAsignar: !r.asignadaAId && !r.equipoId,
        puedeTrabajar: Boolean(r.puedeTrabajar)
      };
    }),
    total,
    pagina,
    totalPaginas,
    indicadores: {
      abiertas: Number(indicadores[0]?.abiertas ?? 0),
      porAceptar: Number(indicadores[0]?.porAceptar ?? 0),
      sinAsignar: Number(indicadores[0]?.sinAsignar ?? 0),
      masDeSieteDias: Number(indicadores[0]?.masDeSieteDias ?? 0),
      sinSeccion: Number(indicadores[0]?.sinSeccion ?? 0),
      mias: Number(indicadores[0]?.mias ?? 0)
    }
  };
}

/**
 * Cuántas incidencias «por aceptar» puede aceptar esta persona: el número junto a «Incidencias» en el menú.
 * Es el mismo número que el filtro «Por aceptar» de la pantalla (antes el menú decía 5 y el filtro 11).
 */
export async function contarPorAceptar(alcance: UserNetworkScope): Promise<number> {
  const er = schema.eventReports;
  const [fila] = await getDatabaseClient()
    .select({ total: count() })
    .from(er)
    .where(and(eq(er.status, "pendiente"), condicionDeIncidencias(alcance, "atender"), incidenciasQuePuedeTrabajar(alcance)));
  return fila?.total ?? 0;
}
