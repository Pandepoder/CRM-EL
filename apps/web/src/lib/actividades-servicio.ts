import { completeVisit, scheduleVisit } from "@tonala/modules/visits/application";
import type { ActorContext } from "@tonala/shared/auth";
import { DevelopmentLogger } from "@tonala/shared/observability";
import { schema } from "@tonala/shared/database";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { esResultadoValido, RESULTADOS_ACTIVIDAD } from "@/lib/actividades";
import { permissionChecker } from "@/lib/api-helpers";
import { buscarMunicipio } from "@/lib/municipios-jalisco";
import { condicionVisibilidad, type OpcionCatalogo } from "@/lib/catalogo-actividades";
import { createVisitsMutationsDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { resolveUserNetworkScope, type UserNetworkScope } from "@/lib/network-hierarchy";
import { processOutboxInline } from "@/lib/outbox";
import { puedeVerContacto } from "@/lib/permisos-contacto";
import {
  cargarContextoIncidencia,
  motivoAsignacionFueraDeAlcance,
  puedeSobreIncidencia,
  MOTIVO_ACTUALIZAR
} from "@/lib/permisos-incidencias";
import { ubicarEnSeccion } from "@/lib/sections-geo-cache";

/**
 * Operaciones sobre una actividad de la bitácora. Las rutas solo validan la forma de la petición
 * y llaman aquí: los permisos, el historial y los efectos sobre la visita vinculada viven en un
 * único sitio.
 *
 * Una actividad y la visita que agenda son UN registro: `event_reports.visit_id` las une, y la
 * lista de visitas no repite las que pertenecen a una actividad. Completar, reprogramar o
 * cancelar la actividad actúa también sobre su visita.
 */

export type ActorActividad = ActorContext;

export type Fallo = { ok: false; status: number; code: string; message: string };
const fallo = (status: number, code: string, message: string): Fallo => ({ ok: false, status, code, message });

type Db = ReturnType<typeof getDatabaseClient>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const ERROR_UNICO = "23505";
function esViolacionUnica(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === ERROR_UNICO || e?.cause?.code === ERROR_UNICO;
}

async function registrarHistorial(
  tx: Tx | Db,
  eventReportId: string,
  actorId: string,
  kind: (typeof schema.activityHistory.$inferInsert)["kind"],
  note?: string | null,
  data?: Record<string, unknown>
) {
  await tx.insert(schema.activityHistory).values({
    eventReportId,
    actorUserId: actorId,
    kind,
    note: note?.trim() || null,
    data: data ?? null
  });
}

async function auditar(
  tx: Tx | Db,
  actor: ActorActividad,
  accion: string,
  entityId: string,
  antes: unknown,
  despues: unknown
) {
  await tx.insert(schema.auditLogs).values({
    actorUserId: actor.actorId,
    action: accion,
    entityType: "event_report",
    entityId,
    correlationId: actor.correlationId,
    beforeData: antes ?? null,
    afterData: despues ?? null
  });
}

/** Lo que el llamador necesita para decidir si puede actuar sobre una actividad. */
async function cargarActividad(id: string, actor: ActorActividad) {
  const db = getDatabaseClient();
  const contexto = await cargarContextoIncidencia(id, actor.actorId, actor.roles);
  if (!contexto.incidencia) return { fallo: fallo(404, "no_encontrada", "La actividad no existe.") } as const;
  if (
    !puedeSobreIncidencia("actualizar", contexto.incidencia, actor.actorId, contexto.esAdmin, contexto.equipos, contexto.personas)
  ) {
    return { fallo: fallo(403, "prohibido", MOTIVO_ACTUALIZAR) } as const;
  }
  const [fila] = await db.select().from(schema.eventReports).where(eq(schema.eventReports.id, id)).limit(1);
  if (!fila) return { fallo: fallo(404, "no_encontrada", "La actividad no existe.") } as const;
  return { fila, contexto } as const;
}

async function resolverTipo(
  alcance: UserNetworkScope,
  entrada: { activityTypeId?: string | null | undefined; categoriaHeredada?: string | undefined }
): Promise<OpcionCatalogo | Fallo> {
  const db = getDatabaseClient();
  const filas = await db
    .select()
    .from(schema.activityCatalogOptions)
    .where(
      and(
        eq(schema.activityCatalogOptions.kind, "type"),
        isNull(schema.activityCatalogOptions.archivedAt),
        condicionVisibilidad(alcance),
        entrada.activityTypeId
          ? eq(schema.activityCatalogOptions.id, entrada.activityTypeId)
          : eq(schema.activityCatalogOptions.key, entrada.categoriaHeredada ?? "")
      )
    )
    .limit(1);
  const f = filas[0];
  if (!f) return fallo(400, "tipo_invalido", "El tipo de actividad no existe, está archivado o no está disponible para ti.");
  return {
    id: f.id,
    kind: "type",
    key: f.key,
    name: f.name,
    description: f.description,
    color: f.color,
    icon: f.icon,
    sortOrder: f.sortOrder,
    incidentCategory: f.incidentCategory,
    scope: f.scope as "organization" | "network",
    isSystem: f.isSystem,
    createsVisit: f.createsVisit,
    createdByUserId: f.createdByUserId,
    archived: false
  };
}

async function validarEtiquetas(alcance: UserNetworkScope, ids: readonly string[]): Promise<string[] | Fallo> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return [];
  if (unicos.length > 12) return fallo(400, "demasiadas_etiquetas", "Una actividad admite hasta 12 etiquetas.");
  const db = getDatabaseClient();
  const validas = await db
    .select({ id: schema.activityCatalogOptions.id })
    .from(schema.activityCatalogOptions)
    .where(
      and(
        eq(schema.activityCatalogOptions.kind, "tag"),
        isNull(schema.activityCatalogOptions.archivedAt),
        inArray(schema.activityCatalogOptions.id, unicos),
        condicionVisibilidad(alcance)
      )
    );
  if (validas.length !== unicos.length) {
    return fallo(400, "etiqueta_invalida", "Alguna etiqueta no existe, está archivada o no está disponible para ti.");
  }
  return unicos;
}

// ---------------------------------------------------------------------------------------------
// Crear
// ---------------------------------------------------------------------------------------------

export type EntradaActividad = {
  title: string;
  description?: string | undefined;
  assignedToUserId?: string | null | undefined;
  scheduledAt: string;
  activityTypeId?: string | null | undefined;
  /** Clave de un tipo del sistema (`platica`, `visita`…): compatibilidad con clientes anteriores. */
  categoriaHeredada?: string | undefined;
  tagIds?: readonly string[] | undefined;
  sectionId?: string | null | undefined;
  contactId?: string | null | undefined;
  locationText?: string | undefined;
  estimatedAttendees?: number | null | undefined;
  latitude: number;
  longitude: number;
  municipality?: string | null | undefined;
  mediaUrls?: unknown[] | undefined;
  clientRequestId?: string | null | undefined;
  /** "programar": a futuro y pendiente. "registrar": ya ocurrió y se cierra al guardar. */
  modo: "programar" | "registrar";
  resultado?: { outcome: string; summary: string } | undefined;
  followUpOfId?: string | null | undefined;
};

export type ResultadoCreacion =
  | { ok: true; actividad: typeof schema.eventReports.$inferSelect; duplicada: boolean; avisos: string[] }
  | Fallo;

export async function crearActividad(actor: ActorActividad, entrada: EntradaActividad): Promise<ResultadoCreacion> {
  const db = getDatabaseClient();
  const titulo = entrada.title.replace(/\s+/g, " ").trim();
  if (!titulo) return fallo(400, "titulo_requerido", "El título es obligatorio.");
  if (titulo.length > 200) return fallo(400, "titulo_largo", "El título no puede pasar de 200 caracteres.");

  const fecha = new Date(entrada.scheduledAt);
  if (Number.isNaN(fecha.getTime())) return fallo(400, "fecha_invalida", "La fecha no es válida.");

  // Reintento o doble clic: la actividad ya existe y se devuelve tal cual.
  if (entrada.clientRequestId) {
    const [previa] = await db
      .select()
      .from(schema.eventReports)
      .where(eq(schema.eventReports.clientRequestId, entrada.clientRequestId))
      .limit(1);
    if (previa) {
      if (previa.createdByUserId !== actor.actorId) return fallo(409, "solicitud_repetida", "Esta solicitud ya se usó.");
      return { ok: true, actividad: previa, duplicada: true, avisos: [] };
    }
  }

  // Mismo criterio que antes, ahora también con la fecha: lo que "ya ocurrió" no puede estar en
  // el futuro, y se cierra con un resultado.
  if (entrada.modo === "registrar") {
    if (fecha.getTime() > Date.now() + 5 * 60_000) {
      return fallo(400, "fecha_futura", "Lo que ya ocurrió no puede tener una fecha futura. Usa «Programar».");
    }
    if (!entrada.resultado || !esResultadoValido(entrada.resultado.outcome)) {
      return fallo(400, "resultado_requerido", "Indica el resultado de la actividad.");
    }
    if (!entrada.resultado.summary.trim()) {
      return fallo(400, "conclusion_requerida", "Escribe qué pasó: la conclusión es obligatoria.");
    }
  }

  // Number.isFinite y no typeof: typeof NaN es "number" y un NaN atravesaba la guarda.
  if (!Number.isFinite(entrada.latitude) || !Number.isFinite(entrada.longitude)) {
    return fallo(400, "ubicacion_requerida", "Falta la ubicación. Márcala en el mapa o usa el GPS antes de guardar.");
  }
  if (entrada.estimatedAttendees != null && (!Number.isInteger(entrada.estimatedAttendees) || entrada.estimatedAttendees < 0)) {
    return fallo(400, "asistentes_invalidos", "Los asistentes deben ser un número entero, cero o más.");
  }

  const alcance = await resolveUserNetworkScope(actor.actorId);
  const responsable = entrada.assignedToUserId || actor.actorId;
  if (responsable !== actor.actorId) {
    const motivo = motivoAsignacionFueraDeAlcance(alcance, { assignedToUserId: responsable });
    if (motivo) return fallo(403, "fuera_de_alcance", "Solo puedes asignar actividades a personas de tu equipo.");
  }

  // La actividad entra en el historial del ciudadano: se pide el mismo acceso que para su ficha.
  // Se responde como si no existiera para no confirmar que el identificador es real.
  if (entrada.contactId && !(await puedeVerContacto(entrada.contactId, actor.actorId, actor.roles))) {
    return fallo(404, "contacto_no_encontrado", "Este ciudadano no pertenece a tu brigada.");
  }

  const tipo = await resolverTipo(alcance, entrada);
  if ("ok" in tipo) return tipo;
  const etiquetas = await validarEtiquetas(alcance, entrada.tagIds ?? []);
  if (!Array.isArray(etiquetas)) return etiquetas;

  if (entrada.sectionId) {
    const [seccion] = await db
      .select({ id: schema.electoralSections.id })
      .from(schema.electoralSections)
      .where(eq(schema.electoralSections.id, entrada.sectionId))
      .limit(1);
    if (!seccion) return fallo(400, "seccion_invalida", "La sección electoral no existe.");
  }

  if (entrada.followUpOfId) {
    const origen = await cargarActividad(entrada.followUpOfId, actor);
    if ("fallo" in origen) return origen.fallo;
  }

  // Municipio explícito si es del catálogo; si no, el de la sección donde cae el punto. Nunca
  // uno por omisión.
  const municipio =
    buscarMunicipio(entrada.municipality ?? undefined)?.name ??
    (await ubicarEnSeccion(entrada.latitude, entrada.longitude))?.seccion.municipality ??
    null;

  const cerrada = entrada.modo === "registrar";
  const ahora = new Date();

  let creada: typeof schema.eventReports.$inferSelect | undefined;
  try {
    creada = await db.transaction(async (tx) => {
      const [fila] = await tx
        .insert(schema.eventReports)
        .values({
          title: titulo,
          description: entrada.description?.trim() ?? "",
          latitude: entrada.latitude,
          longitude: entrada.longitude,
          category: tipo.incidentCategory,
          municipality: municipio,
          sectionId: entrada.sectionId || undefined,
          assignedToUserId: responsable,
          eventDate: fecha,
          status: cerrada ? "resolved" : "active",
          mediaUrls: Array.isArray(entrada.mediaUrls) && entrada.mediaUrls.length > 0 ? entrada.mediaUrls : undefined,
          createdByUserId: actor.actorId,
          activityTypeId: tipo.id,
          locationText: entrada.locationText?.trim() || null,
          estimatedAttendees: entrada.estimatedAttendees ?? null,
          contactId: entrada.contactId || null,
          followUpOfId: entrada.followUpOfId || null,
          clientRequestId: entrada.clientRequestId || null,
          ...(cerrada
            ? {
                outcome: entrada.resultado!.outcome,
                outcomeSummary: entrada.resultado!.summary.trim(),
                closedAt: ahora,
                closedByUserId: actor.actorId
              }
            : {})
        })
        .returning();
      if (!fila) throw new Error("No se pudo crear la actividad.");

      if (etiquetas.length > 0) {
        await tx.insert(schema.activityTagLinks).values(etiquetas.map((optionId) => ({ eventReportId: fila.id, optionId })));
      }
      await registrarHistorial(tx, fila.id, actor.actorId, "created", null, {
        modo: entrada.modo,
        tipo: tipo.name,
        seguimientoDe: entrada.followUpOfId ?? null
      });
      if (cerrada) {
        await registrarHistorial(tx, fila.id, actor.actorId, "completed", entrada.resultado!.summary, {
          outcome: entrada.resultado!.outcome
        });
      }
      await auditar(tx, actor, "agenda.task.create", fila.id, null, {
        title: titulo,
        assignedToUserId: responsable,
        scheduledAt: fecha.toISOString(),
        activityTypeId: tipo.id,
        modo: entrada.modo
      });
      return fila;
    });
  } catch (error) {
    // Dos envíos simultáneos con la misma clave: uno gana y el otro recibe la actividad creada.
    if (entrada.clientRequestId && esViolacionUnica(error)) {
      const [previa] = await db
        .select()
        .from(schema.eventReports)
        .where(eq(schema.eventReports.clientRequestId, entrada.clientRequestId))
        .limit(1);
      if (previa && previa.createdByUserId === actor.actorId) return { ok: true, actividad: previa, duplicada: true, avisos: [] };
    }
    throw error;
  }
  if (!creada) throw new Error("No se pudo crear la actividad.");

  const avisos: string[] = [];

  // Visita del contacto: solo si el tipo lo pide, la actividad es a futuro y hay contacto. La
  // colonia sale del territorio confirmado del contacto (caso de uso `scheduleVisit`), no de
  // "la primera colonia que haya". Si no se puede agendar, la actividad queda guardada y se dice
  // por qué en lugar de fallar en silencio.
  if (tipo.createsVisit && entrada.contactId && entrada.modo === "programar") {
    const visita = await agendarVisitaDeActividad(actor, creada.id, entrada.contactId, fecha, entrada.locationText);
    if (visita.ok) creada = { ...creada, visitId: visita.visitId };
    else avisos.push(`La actividad se guardó, pero no se agendó la visita del contacto: ${visita.motivo}`);
  }

  return { ok: true, actividad: creada, duplicada: false, avisos };
}

async function agendarVisitaDeActividad(
  actor: ActorActividad,
  actividadId: string,
  contactId: string,
  fecha: Date,
  lugar?: string
): Promise<{ ok: true; visitId: string } | { ok: false; motivo: string }> {
  const db = getDatabaseClient();
  try {
    const deps = await createVisitsMutationsDependencies(db);
    const resultado = await scheduleVisit(
      actor,
      { contactId, scheduledAt: fecha.toISOString(), visitLocationText: lugar?.trim() || "Por confirmar" },
      { ...deps, logger: new DevelopmentLogger(), permissionChecker }
    );
    if (!resultado.ok) {
      return { ok: false, motivo: (resultado.error as { publicMessage?: string }).publicMessage ?? "no se pudo agendar." };
    }
    const visitId = resultado.value.visitId as string;
    await db
      .update(schema.eventReports)
      .set({ visitId, updatedAt: new Date() })
      .where(eq(schema.eventReports.id, actividadId));
    await processOutboxInline(db);
    return { ok: true, visitId };
  } catch (error) {
    console.error("Error agendando la visita de una actividad:", error);
    return { ok: false, motivo: "error interno." };
  }
}

// ---------------------------------------------------------------------------------------------
// Acciones sobre una actividad existente
// ---------------------------------------------------------------------------------------------

export type ResultadoAccion =
  | { ok: true; actividad: typeof schema.eventReports.$inferSelect; avisos: string[]; seguimiento?: typeof schema.eventReports.$inferSelect }
  | Fallo;

function estaAbierta(estado: string) {
  return estado === "pendiente" || estado === "active" || estado === "in_progress";
}

export async function iniciarActividad(actor: ActorActividad, id: string): Promise<ResultadoAccion> {
  const cargada = await cargarActividad(id, actor);
  if ("fallo" in cargada) return cargada.fallo;
  const { fila } = cargada;
  if (!estaAbierta(fila.status)) return fallo(409, "estado_invalido", "Solo se puede iniciar una actividad pendiente.");
  const db = getDatabaseClient();
  const actividad = await db.transaction(async (tx) => {
    const [n] = await tx
      .update(schema.eventReports)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(schema.eventReports.id, id))
      .returning();
    await registrarHistorial(tx, id, actor.actorId, "edited", "Actividad en curso.", { estado: { de: fila.status, a: "in_progress" } });
    await auditar(tx, actor, "agenda.task.start", id, { status: fila.status }, { status: "in_progress" });
    return n!;
  });
  return { ok: true, actividad, avisos: [] };
}

export type EntradaCompletar = {
  outcome: string;
  summary: string;
  seguimiento?: { title?: string | undefined; scheduledAt: string; assignedToUserId?: string | null | undefined } | undefined;
};

export async function completarActividad(actor: ActorActividad, id: string, entrada: EntradaCompletar): Promise<ResultadoAccion> {
  if (!esResultadoValido(entrada.outcome)) {
    return fallo(400, "resultado_invalido", "El resultado no es válido.");
  }
  const conclusion = entrada.summary.trim();
  if (!conclusion) return fallo(400, "conclusion_requerida", "Escribe qué pasó: la conclusión es obligatoria.");
  if (conclusion.length > 4000) return fallo(400, "conclusion_larga", "La conclusión no puede pasar de 4000 caracteres.");

  const requiereSeguimiento = RESULTADOS_ACTIVIDAD[entrada.outcome]!.requiereSeguimiento;
  if (requiereSeguimiento && !entrada.seguimiento?.scheduledAt) {
    return fallo(400, "seguimiento_requerido", "Este resultado requiere seguimiento: indica cuándo y quién lo dará.");
  }

  const cargada = await cargarActividad(id, actor);
  if ("fallo" in cargada) return cargada.fallo;
  const { fila } = cargada;
  if (!estaAbierta(fila.status)) return fallo(409, "estado_invalido", "La actividad ya no está pendiente.");

  const db = getDatabaseClient();
  const avisos: string[] = [];

  // La visita vinculada se cierra con su propio caso de uso (permisos, versión, evento) ANTES de
  // tocar la actividad: si la visita no se puede cerrar, la actividad sigue pendiente y no
  // quedan las dos contradiciéndose.
  if (fila.visitId && fila.contactId) {
    const alcance = await resolveUserNetworkScope(actor.actorId);
    const deps = await createVisitsMutationsDependencies(db);
    const r = await completeVisit(
      actor,
      {
        visitId: fila.visitId,
        contactId: fila.contactId,
        scopedUserIds: alcance.allowedUserIds ?? [],
        structuredOutcome: entrada.outcome,
        summary: conclusion
      },
      { ...deps, logger: new DevelopmentLogger(), permissionChecker }
    );
    if (!r.ok) {
      const codigo = (r.error as { code?: string }).code;
      // Visita ya cerrada por otra vía (ficha del contacto): la actividad se pone al día.
      if (codigo !== "visit_already_completed") {
        return fallo(409, "visita_no_cerrada", `No se pudo cerrar la visita vinculada: ${(r.error as { publicMessage?: string }).publicMessage ?? "error"}`);
      }
      avisos.push("La visita vinculada ya estaba cerrada.");
    }
    await processOutboxInline(db);
  }

  const ahora = new Date();
  const actividad = await db.transaction(async (tx) => {
    // Condición sobre el estado: dos personas completando a la vez no cierran dos veces.
    const [n] = await tx
      .update(schema.eventReports)
      .set({
        status: "resolved",
        outcome: entrada.outcome,
        outcomeSummary: conclusion,
        closedAt: ahora,
        closedByUserId: actor.actorId,
        updatedAt: ahora
      })
      .where(and(eq(schema.eventReports.id, id), inArray(schema.eventReports.status, ["pendiente", "active", "in_progress"])))
      .returning();
    if (!n) return null;
    await registrarHistorial(tx, id, actor.actorId, "completed", conclusion, { outcome: entrada.outcome });
    await auditar(tx, actor, "agenda.task.complete", id, { status: fila.status }, { status: "resolved", outcome: entrada.outcome });
    return n;
  });
  if (!actividad) return fallo(409, "estado_invalido", "La actividad ya no está pendiente.");

  let seguimiento: typeof schema.eventReports.$inferSelect | undefined;
  if (entrada.seguimiento?.scheduledAt) {
    const r = await crearSeguimiento(actor, id, entrada.seguimiento);
    if (r.ok) seguimiento = r.actividad;
    else avisos.push(`La actividad se cerró, pero no se creó el seguimiento: ${r.message}`);
  }
  return { ok: true, actividad, avisos, ...(seguimiento ? { seguimiento } : {}) };
}

export async function reprogramarActividad(
  actor: ActorActividad,
  id: string,
  entrada: { scheduledAt: string; reason?: string | undefined }
): Promise<ResultadoAccion> {
  const nueva = new Date(entrada.scheduledAt);
  if (Number.isNaN(nueva.getTime())) return fallo(400, "fecha_invalida", "La nueva fecha no es válida.");

  const cargada = await cargarActividad(id, actor);
  if ("fallo" in cargada) return cargada.fallo;
  const { fila } = cargada;
  if (!estaAbierta(fila.status)) return fallo(409, "estado_invalido", "Solo se puede reprogramar una actividad pendiente.");

  const db = getDatabaseClient();
  const actividad = await db.transaction(async (tx) => {
    const [n] = await tx
      .update(schema.eventReports)
      .set({ eventDate: nueva, updatedAt: new Date() })
      .where(eq(schema.eventReports.id, id))
      .returning();
    if (fila.visitId) {
      const [v] = await tx.select({ version: schema.visits.version }).from(schema.visits).where(eq(schema.visits.id, fila.visitId));
      if (v) {
        await tx
          .update(schema.visits)
          .set({ scheduledAt: nueva, version: v.version + 1, updatedAt: new Date() })
          .where(and(eq(schema.visits.id, fila.visitId), eq(schema.visits.status, "scheduled")));
      }
    }
    await registrarHistorial(tx, id, actor.actorId, "rescheduled", entrada.reason, {
      de: fila.eventDate?.toISOString() ?? null,
      a: nueva.toISOString()
    });
    await auditar(tx, actor, "agenda.task.reschedule", id, { eventDate: fila.eventDate }, { eventDate: nueva });
    return n!;
  });
  return { ok: true, actividad, avisos: [] };
}

export async function cancelarActividad(actor: ActorActividad, id: string, motivo: string): Promise<ResultadoAccion> {
  const razon = motivo.trim();
  if (!razon) return fallo(400, "motivo_requerido", "Indica el motivo de la cancelación.");
  if (razon.length > 1000) return fallo(400, "motivo_largo", "El motivo no puede pasar de 1000 caracteres.");

  const cargada = await cargarActividad(id, actor);
  if ("fallo" in cargada) return cargada.fallo;
  const { fila } = cargada;
  if (!estaAbierta(fila.status)) return fallo(409, "estado_invalido", "Solo se puede cancelar una actividad pendiente.");

  const db = getDatabaseClient();
  const ahora = new Date();
  const actividad = await db.transaction(async (tx) => {
    const [n] = await tx
      .update(schema.eventReports)
      .set({
        status: "cancelada",
        cancelReason: razon,
        closedAt: ahora,
        closedByUserId: actor.actorId,
        // La visita que agendó una actividad cancelada deja de existir como pendiente. Las
        // visitas no tienen estado "cancelada"; una agendada y sin resultado no tiene nada que
        // conservar, y el desvinculado queda anotado en el historial.
        visitId: null,
        updatedAt: ahora
      })
      .where(and(eq(schema.eventReports.id, id), inArray(schema.eventReports.status, ["pendiente", "active", "in_progress"])))
      .returning();
    if (!n) return null;
    let visitaRetirada: string | null = null;
    if (fila.visitId) {
      const borradas = await tx
        .delete(schema.visits)
        .where(and(eq(schema.visits.id, fila.visitId), eq(schema.visits.status, "scheduled")))
        .returning({ id: schema.visits.id });
      visitaRetirada = borradas[0]?.id ?? null;
    }
    await registrarHistorial(tx, id, actor.actorId, "cancelled", razon, { visitaRetirada });
    await auditar(tx, actor, "agenda.task.cancel", id, { status: fila.status }, { status: "cancelada", visitaRetirada });
    return n;
  });
  if (!actividad) return fallo(409, "estado_invalido", "La actividad ya no está pendiente.");
  return { ok: true, actividad, avisos: [] };
}

export async function crearSeguimiento(
  actor: ActorActividad,
  origenId: string,
  entrada: { title?: string | undefined; scheduledAt: string; assignedToUserId?: string | null | undefined }
): Promise<ResultadoCreacion> {
  const cargada = await cargarActividad(origenId, actor);
  if ("fallo" in cargada) return cargada.fallo;
  const { fila } = cargada;

  const r = await crearActividad(actor, {
    title: entrada.title?.trim() || `Seguimiento: ${fila.title}`.slice(0, 200),
    description: "",
    assignedToUserId: entrada.assignedToUserId ?? fila.assignedToUserId,
    scheduledAt: entrada.scheduledAt,
    activityTypeId: fila.activityTypeId,
    // Sin tipo heredado (actividad antigua): se conserva la categoría del mapa.
    ...(fila.activityTypeId ? {} : { categoriaHeredada: "brigada" }),
    sectionId: fila.sectionId,
    contactId: fila.contactId,
    locationText: fila.locationText ?? "",
    latitude: fila.latitude,
    longitude: fila.longitude,
    municipality: fila.municipality,
    modo: "programar",
    followUpOfId: origenId
  });
  if (!r.ok) return r;

  const db = getDatabaseClient();
  await registrarHistorial(db, origenId, actor.actorId, "follow_up_created", null, {
    seguimientoId: r.actividad.id,
    para: entrada.scheduledAt
  });
  return r;
}

export async function archivarActividad(actor: ActorActividad, id: string, archivar: boolean): Promise<ResultadoAccion> {
  const cargada = await cargarActividad(id, actor);
  if ("fallo" in cargada) return cargada.fallo;
  const { fila } = cargada;

  if (archivar && estaAbierta(fila.status)) {
    return fallo(409, "estado_invalido", "Cierra o cancela la actividad antes de archivarla.");
  }
  if (!archivar && fila.status !== "archived") return fallo(409, "estado_invalido", "La actividad no está archivada.");

  // Al restaurar vuelve a donde estaba: cancelada si tiene motivo, resuelta si no.
  const destino = archivar ? "archived" : fila.cancelReason ? "cancelada" : "resolved";
  const db = getDatabaseClient();
  const actividad = await db.transaction(async (tx) => {
    const [n] = await tx
      .update(schema.eventReports)
      .set({ status: destino, updatedAt: new Date() })
      .where(eq(schema.eventReports.id, id))
      .returning();
    await registrarHistorial(tx, id, actor.actorId, archivar ? "archived" : "restored", null, { de: fila.status, a: destino });
    await auditar(tx, actor, archivar ? "agenda.task.archive" : "agenda.task.restore", id, { status: fila.status }, { status: destino });
    return n!;
  });
  return { ok: true, actividad, avisos: [] };
}

export async function agregarNota(actor: ActorActividad, id: string, texto: string): Promise<ResultadoAccion> {
  const nota = texto.trim();
  if (!nota) return fallo(400, "nota_vacia", "La nota no puede estar vacía.");
  if (nota.length > 4000) return fallo(400, "nota_larga", "La nota no puede pasar de 4000 caracteres.");
  const cargada = await cargarActividad(id, actor);
  if ("fallo" in cargada) return cargada.fallo;
  const db = getDatabaseClient();
  await registrarHistorial(db, id, actor.actorId, "note", nota);
  return { ok: true, actividad: cargada.fila, avisos: [] };
}

export type EntradaEdicion = {
  title?: string | undefined;
  description?: string | undefined;
  activityTypeId?: string | undefined;
  tagIds?: readonly string[] | undefined;
  assignedToUserId?: string | null | undefined;
  locationText?: string | undefined;
  estimatedAttendees?: number | null | undefined;
  sectionId?: string | null | undefined;
  mediaUrls?: unknown[] | undefined;
};

export async function editarActividad(actor: ActorActividad, id: string, entrada: EntradaEdicion): Promise<ResultadoAccion> {
  const cargada = await cargarActividad(id, actor);
  if ("fallo" in cargada) return cargada.fallo;
  const { fila } = cargada;
  if (fila.status === "archived") return fallo(409, "estado_invalido", "Restaura la actividad para poder editarla.");

  const alcance = await resolveUserNetworkScope(actor.actorId);
  const abierta = estaAbierta(fila.status);
  const set: Partial<typeof schema.eventReports.$inferInsert> = { updatedAt: new Date() };
  const cambios: Record<string, unknown> = {};

  if (entrada.title !== undefined) {
    const t = entrada.title.replace(/\s+/g, " ").trim();
    if (!t || t.length > 200) return fallo(400, "titulo_invalido", "El título es obligatorio y no puede pasar de 200 caracteres.");
    if (t !== fila.title) { set.title = t; cambios.title = { de: fila.title, a: t }; }
  }
  if (entrada.description !== undefined && entrada.description.trim() !== fila.description) {
    set.description = entrada.description.trim();
    cambios.description = true;
  }
  if (entrada.locationText !== undefined) {
    set.locationText = entrada.locationText.trim() || null;
    cambios.locationText = true;
  }
  if (entrada.estimatedAttendees !== undefined) {
    if (entrada.estimatedAttendees !== null && (!Number.isInteger(entrada.estimatedAttendees) || entrada.estimatedAttendees < 0)) {
      return fallo(400, "asistentes_invalidos", "Los asistentes deben ser un número entero, cero o más.");
    }
    set.estimatedAttendees = entrada.estimatedAttendees;
    cambios.estimatedAttendees = true;
  }
  if (entrada.mediaUrls !== undefined) {
    set.mediaUrls = entrada.mediaUrls.length > 0 ? entrada.mediaUrls : null;
    cambios.mediaUrls = true;
  }
  if (entrada.sectionId !== undefined) {
    if (entrada.sectionId) {
      const db = getDatabaseClient();
      const [s] = await db.select({ id: schema.electoralSections.id }).from(schema.electoralSections).where(eq(schema.electoralSections.id, entrada.sectionId)).limit(1);
      if (!s) return fallo(400, "seccion_invalida", "La sección electoral no existe.");
    }
    set.sectionId = entrada.sectionId;
    cambios.sectionId = true;
  }
  if (entrada.activityTypeId !== undefined && entrada.activityTypeId !== fila.activityTypeId) {
    if (!abierta) return fallo(409, "estado_invalido", "El tipo solo se cambia mientras la actividad está pendiente.");
    const tipo = await resolverTipo(alcance, { activityTypeId: entrada.activityTypeId });
    if ("ok" in tipo) return tipo;
    set.activityTypeId = tipo.id;
    set.category = tipo.incidentCategory;
    cambios.tipo = tipo.name;
  }
  let reasignada = false;
  if (entrada.assignedToUserId !== undefined && entrada.assignedToUserId !== fila.assignedToUserId) {
    const motivo = motivoAsignacionFueraDeAlcance(alcance, { assignedToUserId: entrada.assignedToUserId });
    if (motivo) return fallo(403, "fuera_de_alcance", "Solo puedes asignar actividades a personas de tu equipo.");
    set.assignedToUserId = entrada.assignedToUserId;
    cambios.assignedTo = { de: fila.assignedToUserId, a: entrada.assignedToUserId };
    reasignada = true;
  }
  let etiquetas: string[] | null = null;
  if (entrada.tagIds !== undefined) {
    const v = await validarEtiquetas(alcance, entrada.tagIds);
    if (!Array.isArray(v)) return v;
    etiquetas = v;
    cambios.etiquetas = v.length;
  }
  if (Object.keys(cambios).length === 0) return { ok: true, actividad: fila, avisos: [] };

  const db = getDatabaseClient();
  const actividad = await db.transaction(async (tx) => {
    const [n] = await tx.update(schema.eventReports).set(set).where(eq(schema.eventReports.id, id)).returning();
    if (etiquetas) {
      await tx.delete(schema.activityTagLinks).where(eq(schema.activityTagLinks.eventReportId, id));
      if (etiquetas.length > 0) {
        await tx.insert(schema.activityTagLinks).values(etiquetas.map((optionId) => ({ eventReportId: id, optionId })));
      }
    }
    await registrarHistorial(tx, id, actor.actorId, reasignada ? "reassigned" : "edited", null, cambios);
    await auditar(tx, actor, "agenda.task.update", id, null, cambios);
    return n!;
  });
  return { ok: true, actividad, avisos: [] };
}

export async function historialDeActividad(actor: ActorActividad, id: string) {
  const db = getDatabaseClient();
  const contexto = await cargarContextoIncidencia(id, actor.actorId, actor.roles);
  if (!contexto.incidencia) return fallo(404, "no_encontrada", "La actividad no existe.");
  // Ver el historial exige poder ver la actividad: propia, asignada, de su equipo o de su alcance.
  const puede = puedeSobreIncidencia("actualizar", contexto.incidencia, actor.actorId, contexto.esAdmin, contexto.equipos, contexto.personas);
  if (!puede) return fallo(403, "prohibido", MOTIVO_ACTUALIZAR);

  const filas = await db
    .select({
      id: schema.activityHistory.id,
      kind: schema.activityHistory.kind,
      note: schema.activityHistory.note,
      data: schema.activityHistory.data,
      createdAt: schema.activityHistory.createdAt,
      actorId: schema.activityHistory.actorUserId,
      actorName: schema.userProfiles.displayName
    })
    .from(schema.activityHistory)
    .leftJoin(schema.userProfiles, eq(schema.activityHistory.actorUserId, schema.userProfiles.id))
    .where(eq(schema.activityHistory.eventReportId, id))
    .orderBy(asc(schema.activityHistory.createdAt));
  return { ok: true as const, historial: filas };
}

