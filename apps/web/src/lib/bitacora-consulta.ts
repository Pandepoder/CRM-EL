import { schema } from "@tonala/shared/database";
import {
  and, asc, desc, eq, gte, ilike, inArray, isNull, lt, or, sql, type SQL
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  estadoVisible, inicioDeDia, inicioDeMes, inicioDeSemana, tituloVisible, ZONA_HORARIA
} from "@/lib/actividades";
import type {
  ActividadItem, ArchivoMedia, EstadisticaLider, EstadoFiltro, FiltrosBitacora, PaginaBitacora,
  ResumenBitacora, VistaBitacora
} from "@/lib/bitacora-tipos";
import { ESTADOS_FILTRO, VISTAS_BITACORA } from "@/lib/bitacora-tipos";
import { contactIdRestriction, visibleContactIds } from "@/lib/contact-visibility";
import { getDatabaseClient } from "@/lib/db-client";
import type { UserNetworkScope } from "@/lib/network-hierarchy";
import { puedeSobreIncidencia } from "@/lib/permisos-incidencias";

/**
 * Consulta de la bitácora. Aquí viven, en un solo sitio, las reglas para CONTAR y para LISTAR:
 *
 *  - Una actividad y la visita que agendó son un solo registro. Las visitas vinculadas a una
 *    actividad (`event_reports.visit_id`) no se listan ni se cuentan aparte.
 *  - Cada actividad se atribuye a UNA persona: su responsable (`assigned_to_user_id`) y, si no
 *    tiene, quien la creó. Antes se sumaba a ambas, y la misma actividad contaba dos veces al
 *    sumar la productividad del equipo.
 *  - Pendiente = abierta (pendiente, aceptada o en proceso); completada = resuelta. Una cancelada
 *    no es ni una ni otra. "Vencida" se calcula por fecha y estado, no se guarda.
 *  - Los días se cuentan en la zona horaria de la bitácora, no en la del servidor.
 */

export const TAMANO_PAGINA = 20;
const ABIERTOS = ["pendiente", "active", "in_progress"] as const;
const PENDIENTES_DE_FECHA = ["pendiente", "active"] as const;
const CERRADOS = ["resolved", "cancelada", "rechazada", "archived"] as const;

export type ContextoBitacora = {
  userId: string;
  alcance: UserNetworkScope;
  esAdmin: boolean;
  puedeAsignar: boolean;
  /** Personas cuyas actividades se pueden consultar. `null` = todas (administración). */
  personas: string[] | null;
};

export function crearContexto(alcance: UserNetworkScope): ContextoBitacora {
  const esAdmin = alcance.isGlobal;
  return {
    userId: alcance.userId,
    alcance,
    esAdmin,
    puedeAsignar: esAdmin || alcance.isLeader || alcance.roleKey === "territorial_coordinator",
    personas: esAdmin ? null : alcance.teammateUserIds
  };
}

const VISTAS_VALIDAS = new Set<string>(VISTAS_BITACORA.map((v) => v.clave));
const ESTADOS_VALIDOS = new Set<string>(ESTADOS_FILTRO);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Filtros a partir de la URL. Todo lo desconocido se ignora en vez de romper la página. */
export function leerFiltros(sp: Record<string, string | string[] | undefined>): FiltrosBitacora {
  const uno = (k: string): string | null => {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.trim() ? s.trim() : null;
  };
  // `filter` es el parámetro de la versión anterior: se sigue entendiendo.
  const vistaCruda = uno("vista") ?? uno("filter");
  const vista = vistaCruda && VISTAS_VALIDAS.has(vistaCruda) ? (vistaCruda as VistaBitacora) : "hoy";
  const id = (k: string) => {
    const v = uno(k);
    return v && UUID.test(v) ? v : null;
  };
  const fecha = (k: string) => {
    const v = uno(k);
    return v && FECHA.test(v) && !Number.isNaN(new Date(`${v}T12:00:00Z`).getTime()) ? v : null;
  };
  const estado = uno("estado");
  const resultado = uno("resultado");
  return {
    vista,
    desde: fecha("desde"),
    hasta: fecha("hasta"),
    scope: uno("scope") === "equipo" ? "equipo" : "mis",
    responsableId: id("leaderId") ?? id("responsable"),
    tipoId: id("tipo"),
    estado: estado && ESTADOS_VALIDOS.has(estado) ? (estado as EstadoFiltro) : null,
    resultado: resultado && /^[a-z_]{2,30}$/.test(resultado) ? resultado : null,
    contactoId: id("contacto"),
    etiquetaId: id("etiqueta"),
    q: (uno("q") ?? "").slice(0, 80),
    pagina: Math.max(1, Math.min(500, Number(uno("pagina")) || 1)),
    id: null
  };
}

/** Rango [desde, hasta) que pide la vista o el periodo personalizado; null = sin límite de fecha. */
function rangoDeFechas(f: FiltrosBitacora, ahora: Date): { desde: Date | null; hasta: Date | null } {
  if (f.desde || f.hasta) {
    return {
      desde: f.desde ? inicioDeDia(new Date(`${f.desde}T12:00:00Z`)) : null,
      hasta: f.hasta ? inicioDeDia(new Date(`${f.hasta}T12:00:00Z`), 1) : null
    };
  }
  if (f.vista === "hoy") return { desde: inicioDeDia(ahora), hasta: inicioDeDia(ahora, 1) };
  if (f.vista === "semana") {
    const d = inicioDeSemana(ahora);
    return { desde: d, hasta: new Date(d.getTime() + 7 * 86_400_000) };
  }
  if (f.vista === "mes") return { desde: inicioDeMes(ahora), hasta: inicioDeMes(ahora, 1) };
  return { desde: null, hasta: null };
}

export function descripcionPeriodo(f: FiltrosBitacora): string {
  if (f.desde || f.hasta) {
    return `del ${f.desde ?? "inicio"} al ${f.hasta ?? "hoy"}`;
  }
  const v = VISTAS_BITACORA.find((x) => x.clave === f.vista);
  return v ? v.etiqueta.toLowerCase() : "todo el historial";
}

/** A quién pertenece la consulta: mi agenda, la de una persona concreta, o toda la estructura. */
function personaObjetivo(ctx: ContextoBitacora, f: FiltrosBitacora): string | undefined {
  if (f.id) return undefined;
  if (f.responsableId && (ctx.esAdmin || ctx.alcance.teammateUserIds.includes(f.responsableId))) return f.responsableId;
  if (f.scope === "mis" || !ctx.puedeAsignar) return ctx.userId;
  return undefined;
}

function condicionAlcanceEventos(ctx: ContextoBitacora, objetivo: string | undefined): SQL | undefined {
  const er = schema.eventReports;
  // Una incidencia asignada a mi brigada es trabajo mío aunque no lleve mi nombre.
  const equipos = ctx.alcance.teamIds ?? [];
  const porEquipo = equipos.length > 0 ? inArray(er.assignedTeamId, equipos) : undefined;
  if (objetivo) {
    return or(
      eq(er.assignedToUserId, objetivo),
      eq(er.createdByUserId, objetivo),
      // Solo la agenda propia hereda el trabajo de los equipos de quien consulta.
      ...(objetivo === ctx.userId && porEquipo ? [porEquipo] : [])
    );
  }
  if (ctx.personas === null) return undefined;
  return or(inArray(er.assignedToUserId, ctx.personas), inArray(er.createdByUserId, ctx.personas), ...(porEquipo ? [porEquipo] : []));
}

function condicionAlcanceVisitas(ctx: ContextoBitacora, objetivo: string | undefined): SQL | undefined {
  if (objetivo) return eq(schema.visits.assignedUserId, objetivo);
  if (ctx.personas === null) return undefined;
  return inArray(schema.visits.assignedUserId, ctx.personas);
}

function comodin(texto: string): string {
  return `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}


/** Condiciones de estado/vista de las actividades (`event_reports`). */
function condicionesEvento(f: FiltrosBitacora, ahora: Date, vista: VistaBitacora | null): SQL[] {
  const er = schema.eventReports;
  const c: SQL[] = [];
  // Ficha de una actividad: solo importa cuál es, no en qué vista o filtro caería.
  if (f.id) return [eq(er.id, f.id)];
  const v = vista ?? f.vista;
  const { desde, hasta } = rangoDeFechas({ ...f, vista: v }, ahora);
  if (desde) c.push(gte(er.eventDate, desde));
  if (hasta) c.push(lt(er.eventDate, hasta));

  const soloVista = !(f.desde || f.hasta);
  if (soloVista) {
    if (v === "vencidas") c.push(inArray(er.status, [...PENDIENTES_DE_FECHA]), lt(er.eventDate, ahora));
    else if (v === "proximas") c.push(inArray(er.status, [...ABIERTOS]), or(isNull(er.eventDate), gte(er.eventDate, ahora))!);
    else if (v === "seguimiento") c.push(or(eq(er.outcome, "follow_up_required"), sql`${er.followUpOfId} IS NOT NULL`)!);
    else if (v === "historial") c.push(inArray(er.status, [...CERRADOS]));
  }

  if (f.estado) {
    switch (f.estado) {
      case "programada": c.push(inArray(er.status, [...PENDIENTES_DE_FECHA]), or(isNull(er.eventDate), gte(er.eventDate, ahora))!); break;
      case "en_curso": c.push(eq(er.status, "in_progress")); break;
      case "vencida": c.push(inArray(er.status, [...PENDIENTES_DE_FECHA]), lt(er.eventDate, ahora)); break;
      case "completada": c.push(eq(er.status, "resolved")); break;
      case "cancelada": c.push(inArray(er.status, ["cancelada", "rechazada"])); break;
      case "archivada": c.push(eq(er.status, "archived")); break;
    }
  } else if (v !== "historial") {
    // Lo archivado se retira de la vista habitual; sigue en el historial y con el filtro.
    c.push(sql`${er.status} <> 'archived'`);
  }
  if (f.tipoId) c.push(eq(er.activityTypeId, f.tipoId));
  if (f.resultado) c.push(eq(er.outcome, f.resultado));
  if (f.contactoId) c.push(eq(er.contactId, f.contactoId));
  if (f.etiquetaId) {
    c.push(sql`EXISTS (SELECT 1 FROM activity_tag_links l WHERE l.event_report_id = ${er.id} AND l.option_id = ${f.etiquetaId})`);
  }
  if (f.q) {
    const k = comodin(f.q);
    c.push(or(ilike(er.title, k), ilike(er.description, k), ilike(er.locationText, k))!);
  }
  return c;
}

/** Condiciones de las visitas sueltas: las que no pertenecen a ninguna actividad. */
function condicionesVisita(f: FiltrosBitacora, ahora: Date, vista: VistaBitacora | null, tipoVisitaId: string | null): SQL[] | null {
  const vt = schema.visits;
  const c: SQL[] = [sql`NOT EXISTS (SELECT 1 FROM event_reports er WHERE er.visit_id = ${vt.id})`];
  if (f.id) return [...c, eq(vt.id, f.id)];
  const v = vista ?? f.vista;
  const { desde, hasta } = rangoDeFechas({ ...f, vista: v }, ahora);
  if (desde) c.push(gte(vt.scheduledAt, desde));
  if (hasta) c.push(lt(vt.scheduledAt, hasta));

  // Lo que una visita no puede ser hace que no aparezca, en vez de aparecer y engañar.
  if (f.etiquetaId) return null;
  if (f.tipoId && f.tipoId !== tipoVisitaId) return null;
  if (f.estado === "en_curso" || f.estado === "cancelada" || f.estado === "archivada") return null;

  const soloVista = !(f.desde || f.hasta);
  if (soloVista) {
    if (v === "vencidas") c.push(eq(vt.status, "scheduled"), lt(vt.scheduledAt, ahora));
    else if (v === "proximas") c.push(eq(vt.status, "scheduled"), gte(vt.scheduledAt, ahora));
    else if (v === "seguimiento") c.push(sql`EXISTS (SELECT 1 FROM visit_results r WHERE r.visit_id = ${vt.id} AND r.structured_outcome = 'follow_up_required')`);
    else if (v === "historial") c.push(eq(vt.status, "completed"));
  }
  if (f.estado === "programada") c.push(eq(vt.status, "scheduled"), gte(vt.scheduledAt, ahora));
  if (f.estado === "vencida") c.push(eq(vt.status, "scheduled"), lt(vt.scheduledAt, ahora));
  if (f.estado === "completada") c.push(eq(vt.status, "completed"));
  if (f.resultado) c.push(sql`EXISTS (SELECT 1 FROM visit_results r WHERE r.visit_id = ${vt.id} AND r.structured_outcome = ${f.resultado})`);
  if (f.contactoId) c.push(eq(vt.contactId, f.contactoId));
  if (f.q) c.push(ilike(schema.contacts.displayName, comodin(f.q)));
  return c;
}

export async function consultarBitacora(ctx: ContextoBitacora, f: FiltrosBitacora): Promise<PaginaBitacora> {
  const db = getDatabaseClient();
  const ahora = new Date();
  const er = schema.eventReports;
  const vt = schema.visits;
  const objetivo = personaObjetivo(ctx, f);
  const visibles = contactIdRestriction(await visibleContactIds(ctx.alcance));
  const alcanceEv = condicionAlcanceEventos(ctx, objetivo);
  const alcanceVi = condicionAlcanceVisitas(ctx, objetivo);

  const [tipoVisita] = await db
    .select({ id: schema.activityCatalogOptions.id, nombre: schema.activityCatalogOptions.name, color: schema.activityCatalogOptions.color })
    .from(schema.activityCatalogOptions)
    .where(and(eq(schema.activityCatalogOptions.kind, "type"), eq(schema.activityCatalogOptions.key, "visita"), eq(schema.activityCatalogOptions.isSystem, true)))
    .limit(1);

  const condEv = (vista: VistaBitacora | null) => and(alcanceEv, ...condicionesEvento(f, ahora, vista));
  const condVi = (vista: VistaBitacora | null) => {
    const c = condicionesVisita(f, ahora, vista, tipoVisita?.id ?? null);
    return c ? and(alcanceVi, visibles, ...c) : null;
  };

  const contarEv = async (vista: VistaBitacora | null) => {
    const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(er).where(condEv(vista));
    return r?.n ?? 0;
  };
  const contarVi = async (vista: VistaBitacora | null) => {
    const cond = condVi(vista);
    if (!cond) return 0;
    const [r] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(vt)
      .innerJoin(schema.contacts, eq(vt.contactId, schema.contacts.id))
      .where(cond);
    return r?.n ?? 0;
  };

  const rapidas = VISTAS_BITACORA.filter((v) => v.rapida).map((v) => v.clave);
  const [totalEv, totalVi, ...porVista] = await Promise.all([
    contarEv(null),
    contarVi(null),
    ...rapidas.map(async (v) => (await contarEv(v)) + (await contarVi(v)))
  ]);
  const conteos: Partial<Record<VistaBitacora, number>> = {};
  rapidas.forEach((v, i) => { conteos[v] = porVista[i] ?? 0; });
  const total = totalEv + totalVi;

  const descendente = f.vista === "historial";
  const orden = descendente ? desc : asc;
  const tope = f.pagina * TAMANO_PAGINA;

  const creador = alias(schema.userProfiles, "creador");
  const cerrador = alias(schema.userProfiles, "cerrador");
  const asignado = alias(schema.userProfiles, "asignado");

  const filasEv = await db
    .select({
      id: er.id, status: er.status, fecha: er.eventDate, title: er.title, description: er.description,
      category: er.category, municipality: er.municipality, locationText: er.locationText,
      estimatedAttendees: er.estimatedAttendees, latitude: er.latitude, longitude: er.longitude, outcome: er.outcome, outcomeSummary: er.outcomeSummary,
      cancelReason: er.cancelReason, closedAt: er.closedAt, mediaUrls: er.mediaUrls, visitId: er.visitId,
      followUpOfId: er.followUpOfId, contactId: er.contactId, assignedToUserId: er.assignedToUserId,
      assignedTeamId: er.assignedTeamId, createdByUserId: er.createdByUserId,
      tipoId: schema.activityCatalogOptions.id, tipoNombre: schema.activityCatalogOptions.name,
      tipoClave: schema.activityCatalogOptions.key, tipoColor: schema.activityCatalogOptions.color,
      sectionId: schema.electoralSections.id, sectionNum: schema.electoralSections.sectionNum,
      asignadoNombre: asignado.displayName, equipoNombre: schema.teams.name,
      creadorNombre: creador.displayName, cerradorNombre: cerrador.displayName,
      contactoNombre: schema.contacts.displayName
    })
    .from(er)
    .leftJoin(schema.activityCatalogOptions, eq(er.activityTypeId, schema.activityCatalogOptions.id))
    .leftJoin(schema.electoralSections, eq(er.sectionId, schema.electoralSections.id))
    .leftJoin(asignado, eq(er.assignedToUserId, asignado.id))
    .leftJoin(creador, eq(er.createdByUserId, creador.id))
    .leftJoin(cerrador, eq(er.closedByUserId, cerrador.id))
    .leftJoin(schema.teams, eq(er.assignedTeamId, schema.teams.id))
    // El nombre del ciudadano solo asoma si el directorio se lo enseñaría a esta persona.
    .leftJoin(schema.contacts, visibles ? and(eq(er.contactId, schema.contacts.id), visibles) : eq(er.contactId, schema.contacts.id))
    .where(condEv(null))
    .orderBy(orden(er.eventDate), orden(er.createdAt))
    .limit(tope);

  const condVisitas = condVi(null);
  const filasVi = condVisitas
    ? await db
        .select({
          id: vt.id, status: vt.status, fecha: vt.scheduledAt, lugar: vt.visitLocationText,
          contactId: vt.contactId, contactoNombre: schema.contacts.displayName, assignedUserId: vt.assignedUserId,
          asignadoNombre: asignado.displayName, creadorNombre: creador.displayName,
          outcome: schema.visitResults.structuredOutcome, outcomeSummary: schema.visitResults.summary,
          closedAt: vt.completedAt
        })
        .from(vt)
        .innerJoin(schema.contacts, eq(vt.contactId, schema.contacts.id))
        .leftJoin(asignado, eq(vt.assignedUserId, asignado.id))
        .leftJoin(creador, eq(vt.createdByUserId, creador.id))
        .leftJoin(schema.visitResults, eq(schema.visitResults.visitId, vt.id))
        .where(condVisitas)
        .orderBy(orden(vt.scheduledAt))
        .limit(tope)
    : [];

  const idsEv = filasEv.map((r) => r.id);
  const [etiquetasFilas, seguimientos] = idsEv.length
    ? await Promise.all([
        db
          .select({ actividad: schema.activityTagLinks.eventReportId, id: schema.activityCatalogOptions.id, name: schema.activityCatalogOptions.name })
          .from(schema.activityTagLinks)
          .innerJoin(schema.activityCatalogOptions, eq(schema.activityTagLinks.optionId, schema.activityCatalogOptions.id))
          .where(inArray(schema.activityTagLinks.eventReportId, idsEv)),
        db
          .selectDistinct({ origen: er.followUpOfId })
          .from(er)
          .where(inArray(er.followUpOfId, idsEv))
      ])
    : [[], []];
  const etiquetasPor = new Map<string, Array<{ id: string; name: string }>>();
  for (const e of etiquetasFilas) etiquetasPor.set(e.actividad, [...(etiquetasPor.get(e.actividad) ?? []), { id: e.id, name: e.name }]);
  const conSeguimiento = new Set(seguimientos.map((s) => s.origen).filter((x): x is string => !!x));

  const itemsEv: ActividadItem[] = filasEv.map((r) => {
    const fecha = r.fecha ?? new Date(0);
    const tipo = r.tipoId ? { id: r.tipoId, nombre: r.tipoNombre!, clave: r.tipoClave, color: r.tipoColor } : null;
    const seccion = r.sectionNum ? `Sección #${r.sectionNum}${r.municipality ? ` (${r.municipality})` : ""}` : r.municipality || "Sin ubicación";
    return {
      id: r.id,
      origen: "actividad",
      status: r.status,
      estado: estadoVisible(r.status, r.fecha, ahora),
      scheduledAt: fecha.toISOString(),
      title: tituloVisible(r.title, tipo !== null),
      description: r.description ?? "",
      location: seccion,
      locationText: r.locationText,
      estimatedAttendees: r.estimatedAttendees,
      latitude: r.latitude,
      longitude: r.longitude,
      contactId: r.contactId,
      // Si el contacto no es visible para esta persona, tampoco se muestra su vínculo.
      contactName: r.contactoNombre,
      tipo,
      categoria: r.category,
      etiquetas: etiquetasPor.get(r.id) ?? [],
      outcome: r.outcome,
      outcomeSummary: r.outcomeSummary,
      cancelReason: r.cancelReason,
      closedAt: r.closedAt ? r.closedAt.toISOString() : null,
      closedByName: r.cerradorNombre,
      assignedUserId: r.assignedToUserId,
      // Sin responsable individual pero con equipo: la brigada responde por ella.
      assignedUserName: r.asignadoNombre || (r.equipoNombre ? `Brigada: ${r.equipoNombre}` : "Sin asignar"),
      createdByName: r.creadorNombre,
      sectionId: r.sectionId,
      sectionNum: r.sectionNum,
      municipality: r.municipality,
      mediaUrls: Array.isArray(r.mediaUrls) ? (r.mediaUrls as ArchivoMedia[]) : [],
      visitId: r.visitId,
      followUpOfId: r.followUpOfId,
      tieneSeguimiento: conSeguimiento.has(r.id),
      puedeActuar: puedeSobreIncidencia(
        "actualizar",
        { createdByUserId: r.createdByUserId, assignedToUserId: r.assignedToUserId, assignedTeamId: r.assignedTeamId, description: r.description ?? "" },
        ctx.userId, ctx.esAdmin, ctx.alcance.teamIds, ctx.alcance.teammateUserIds
      ),
      puedeBorrar: ctx.esAdmin || r.createdByUserId === ctx.userId
    };
  });

  const itemsVi: ActividadItem[] = filasVi.map((v) => ({
    id: v.id,
    origen: "visita",
    status: v.status,
    estado: estadoVisible(v.status, v.fecha, ahora),
    scheduledAt: v.fecha.toISOString(),
    title: `${tipoVisita?.nombre ?? "Visita domiciliaria"}: ${v.contactoNombre}`,
    description: "",
    location: v.lugar || "Domicilio en campo",
    locationText: v.lugar,
    estimatedAttendees: null,
    latitude: null,
    longitude: null,
    contactId: v.contactId,
    contactName: v.contactoNombre,
    tipo: tipoVisita ? { id: tipoVisita.id, nombre: tipoVisita.nombre, clave: "visita", color: tipoVisita.color } : null,
    categoria: "servicios",
    etiquetas: [],
    outcome: v.outcome,
    outcomeSummary: v.outcomeSummary,
    cancelReason: null,
    closedAt: v.closedAt ? v.closedAt.toISOString() : null,
    closedByName: null,
    assignedUserId: v.assignedUserId,
    assignedUserName: v.asignadoNombre || "Sin asignar",
    createdByName: v.creadorNombre,
    sectionId: null,
    sectionNum: null,
    municipality: null,
    mediaUrls: [],
    visitId: v.id,
    followUpOfId: null,
    tieneSeguimiento: false,
    puedeActuar: ctx.esAdmin || v.assignedUserId === ctx.userId || ctx.alcance.teammateUserIds.includes(v.assignedUserId),
    puedeBorrar: false
  }));

  const ordenados = [...itemsEv, ...itemsVi].sort((a, b) => {
    const d = new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    return descendente ? -d : d;
  });
  const items = ordenados.slice((f.pagina - 1) * TAMANO_PAGINA, f.pagina * TAMANO_PAGINA);

  return { items, total, pagina: f.pagina, tamano: TAMANO_PAGINA, conteos };
}

/**
 * Cifras de productividad por persona, calculadas en la base de datos (no cargando cada
 * actividad). Reglas: cada actividad se atribuye a su responsable, o a quien la creó si no
 * tiene; las visitas vinculadas a una actividad no cuentan aparte; el periodo es el de los
 * filtros (`desde`/`hasta`) o todo el historial si no hay ninguno.
 */
export async function resumenBitacora(
  ctx: ContextoBitacora,
  f: FiltrosBitacora,
  usuarios: Array<{ id: string; displayName: string; email: string; roleKey: string | null; roleName: string | null }>,
  equipos: Array<{ leaderId: string; name: string }>
): Promise<ResumenBitacora> {
  const db = getDatabaseClient();
  const ahora = new Date();
  const er = schema.eventReports;
  const vt = schema.visits;
  const ids = usuarios.map((u) => u.id);

  const periodo = f.desde || f.hasta ? rangoDeFechas(f, ahora) : { desde: null, hasta: null };
  const responsable = sql<string>`COALESCE(${er.assignedToUserId}, ${er.createdByUserId})`;

  const [eventos, visitas, contactos] = ids.length
    ? await Promise.all([
        db
          .select({
            uid: responsable,
            tipo: sql<string>`COALESCE(${schema.activityCatalogOptions.name}, 'Sin tipo')`,
            estado: er.status,
            vencida: sql<boolean>`(${er.status} IN ('pendiente','active') AND ${er.eventDate} < now())`,
            n: sql<number>`count(*)::int`,
            ultima: sql<Date | null>`max(${er.eventDate})`
          })
          .from(er)
          .leftJoin(schema.activityCatalogOptions, eq(er.activityTypeId, schema.activityCatalogOptions.id))
          .where(and(
            inArray(responsable, ids),
            periodo.desde ? gte(er.eventDate, periodo.desde) : undefined,
            periodo.hasta ? lt(er.eventDate, periodo.hasta) : undefined
          ))
          .groupBy(responsable, sql`COALESCE(${schema.activityCatalogOptions.name}, 'Sin tipo')`, er.status, sql`(${er.status} IN ('pendiente','active') AND ${er.eventDate} < now())`),
        db
          .select({
            uid: vt.assignedUserId,
            estado: vt.status,
            vencida: sql<boolean>`(${vt.status} = 'scheduled' AND ${vt.scheduledAt} < now())`,
            n: sql<number>`count(*)::int`,
            ultima: sql<Date | null>`max(${vt.scheduledAt})`
          })
          .from(vt)
          .where(and(
            inArray(vt.assignedUserId, ids),
            sql`NOT EXISTS (SELECT 1 FROM event_reports x WHERE x.visit_id = ${vt.id})`,
            periodo.desde ? gte(vt.scheduledAt, periodo.desde) : undefined,
            periodo.hasta ? lt(vt.scheduledAt, periodo.hasta) : undefined
          ))
          .groupBy(vt.assignedUserId, vt.status, sql`(${vt.status} = 'scheduled' AND ${vt.scheduledAt} < now())`),
        db
          .select({ uid: schema.contacts.createdByUserId, n: sql<number>`count(*)::int` })
          .from(schema.contacts)
          .where(and(
            eq(schema.contacts.status, "active"),
            inArray(schema.contacts.createdByUserId, ids),
            contactIdRestriction(await visibleContactIds(ctx.alcance))
          ))
          .groupBy(schema.contacts.createdByUserId)
      ])
    : [[], [], []];

  type Acum = { total: number; completadas: number; pendientes: number; vencidas: number; tipos: Map<string, number>; ultima: Date | null };
  const acum = new Map<string, Acum>();
  const de = (uid: string) => {
    let a = acum.get(uid);
    if (!a) { a = { total: 0, completadas: 0, pendientes: 0, vencidas: 0, tipos: new Map(), ultima: null }; acum.set(uid, a); }
    return a;
  };
  const registrarUltima = (a: Acum, d: Date | string | null) => {
    if (!d) return;
    const dt = new Date(d);
    if (!a.ultima || dt > a.ultima) a.ultima = dt;
  };

  for (const e of eventos) {
    const a = de(e.uid);
    a.total += e.n;
    if (e.estado === "resolved") a.completadas += e.n;
    else if (["pendiente", "active", "in_progress"].includes(e.estado)) a.pendientes += e.n;
    if (e.vencida) a.vencidas += e.n;
    a.tipos.set(e.tipo, (a.tipos.get(e.tipo) ?? 0) + e.n);
    registrarUltima(a, e.ultima);
  }
  for (const v of visitas) {
    const a = de(v.uid);
    a.total += v.n;
    if (v.estado === "completed") a.completadas += v.n;
    else a.pendientes += v.n;
    if (v.vencida) a.vencidas += v.n;
    a.tipos.set("Visita domiciliaria", (a.tipos.get("Visita domiciliaria") ?? 0) + v.n);
    registrarUltima(a, v.ultima);
  }
  const contactosPor = new Map(contactos.map((c) => [c.uid, c.n]));

  const lideres: EstadisticaLider[] = usuarios
    .map((u) => {
      const a = acum.get(u.id);
      const equipo = equipos.find((t) => t.leaderId === u.id);
      const cerradas = (a?.completadas ?? 0);
      // Tasa sobre lo que se pudo cerrar: las canceladas no cuentan a favor ni en contra.
      const base = (a?.completadas ?? 0) + (a?.pendientes ?? 0);
      return {
        userId: u.id,
        displayName: u.displayName,
        email: u.email,
        roleKey: u.roleKey || "visit_responsible",
        roleName:
          u.roleKey === "territorial_coordinator" ? "Líder"
          : u.roleKey === "capturist" ? "Coordinador Territorial"
          : u.roleKey === "visit_responsible" ? "Brigadista"
          : u.roleName || "Operador",
        teamName: equipo?.name || `Equipo de ${u.displayName.split(" ")[0]}`,
        totalActivities: a?.total ?? 0,
        completedActivities: cerradas,
        pendingActivities: a?.pendientes ?? 0,
        overdueActivities: a?.vencidas ?? 0,
        tipos: [...(a?.tipos.entries() ?? [])].map(([nombre, total]) => ({ nombre, total })).sort((x, y) => y.total - x.total),
        contactsCount: contactosPor.get(u.id) ?? 0,
        completionRate: base > 0 ? Math.round((cerradas / base) * 100) : 0,
        latestActivityAt: a?.ultima ? a.ultima.toISOString() : null
      };
    })
    .sort((x, y) => (y.totalActivities + y.contactsCount) - (x.totalActivities + x.contactsCount));

  const alcanceTxt = ctx.esAdmin ? "toda la organización" : "las personas de tu estructura";
  const periodoTxt = f.desde || f.hasta ? `del ${f.desde ?? "inicio"} al ${f.hasta ?? "hoy"}` : "todo el historial";
  return {
    lideres,
    descripcion: `Cifras de ${alcanceTxt}, ${periodoTxt} (zona horaria ${ZONA_HORARIA}). Cada actividad cuenta una sola vez, para su responsable.`
  };
}

/** Una actividad (o visita suelta) por id, con las mismas reglas de visibilidad que el listado. */
export async function actividadPorId(ctx: ContextoBitacora, id: string): Promise<ActividadItem | null> {
  const f: FiltrosBitacora = { ...leerFiltros({}), vista: "todas", scope: "equipo", id };
  const r = await consultarBitacora(ctx, f);
  return r.items[0] ?? null;
}
