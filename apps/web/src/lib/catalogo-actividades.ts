import { schema } from "@tonala/shared/database";
import { and, asc, count, eq, ilike, inArray, isNull, max, or, sql, type SQL } from "drizzle-orm";

import { claveDesdeNombre, normalizarNombre } from "@/lib/actividades";
import { esCategoriaValida } from "@/lib/categorias-incidencia";
import { getDatabaseClient } from "@/lib/db-client";
import type { UserNetworkScope } from "@/lib/network-hierarchy";

/**
 * Catálogo de opciones de la bitácora (tipos de actividad y etiquetas).
 *
 * Reglas, en un solo sitio para que las rutas no puedan divergir:
 *
 *  - Visibilidad: una opción de toda la organización la ve cualquiera; una de red, quien la creó
 *    y las personas de su alcance (la misma cascada que el resto de la aplicación: dirección no
 *    ve lo que creó otra dirección). Administración lo ve todo.
 *  - Nombre único por alcance, comparado sin acentos, mayúsculas ni espacios de más. Crear algo
 *    que ya existe devuelve la opción existente, no un error: quien tecleó "llamada de
 *    seguimiento" quiere esa opción, exista ya o no.
 *  - Dos personas creando la misma opción a la vez: el índice único deja pasar una y la otra
 *    recibe la ganadora.
 *  - Archivar no borra: las actividades anteriores siguen mostrando la opción.
 */

export type TipoOpcion = "type" | "tag" | "profile";

export type OpcionCatalogo = {
  id: string;
  kind: TipoOpcion;
  key: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  incidentCategory: string;
  scope: "organization" | "network";
  isSystem: boolean;
  createsVisit: boolean;
  createdByUserId: string | null;
  archived: boolean;
  /** Cuántas actividades la usan. Solo se calcula al administrar. */
  usos?: number;
};

const COLUMNAS = {
  id: schema.activityCatalogOptions.id,
  kind: schema.activityCatalogOptions.kind,
  key: schema.activityCatalogOptions.key,
  name: schema.activityCatalogOptions.name,
  description: schema.activityCatalogOptions.description,
  color: schema.activityCatalogOptions.color,
  icon: schema.activityCatalogOptions.icon,
  sortOrder: schema.activityCatalogOptions.sortOrder,
  incidentCategory: schema.activityCatalogOptions.incidentCategory,
  scope: schema.activityCatalogOptions.scope,
  isSystem: schema.activityCatalogOptions.isSystem,
  createsVisit: schema.activityCatalogOptions.createsVisit,
  createdByUserId: schema.activityCatalogOptions.createdByUserId,
  archivedAt: schema.activityCatalogOptions.archivedAt
};

type Fila = {
  id: string;
  kind: string;
  key: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  incidentCategory: string;
  scope: string;
  isSystem: boolean;
  createsVisit: boolean;
  createdByUserId: string | null;
  archivedAt: Date | null;
};

function aOpcion(f: Fila, usos?: number): OpcionCatalogo {
  return {
    id: f.id,
    kind: f.kind as TipoOpcion,
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
    archived: f.archivedAt !== null,
    ...(usos !== undefined ? { usos } : {})
  };
}

/** Condición SQL de las opciones que puede ver quien tiene este alcance. */
export function condicionVisibilidad(alcance: UserNetworkScope): SQL | undefined {
  if (alcance.isGlobal) return undefined;
  const personas = [...new Set([alcance.userId, ...(alcance.allowedUserIds ?? [])])];
  return or(
    eq(schema.activityCatalogOptions.scope, "organization"),
    inArray(schema.activityCatalogOptions.createdByUserId, personas)
  );
}

/** Escapa los comodines de LIKE para que "50%" se busque literal. */
function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function listarOpciones(
  alcance: UserNetworkScope,
  opciones: {
    kind: TipoOpcion;
    q?: string | undefined;
    incluirArchivadas?: boolean | undefined;
    conUsos?: boolean | undefined;
    limite?: number | undefined;
  }
): Promise<OpcionCatalogo[]> {
  const db = getDatabaseClient();
  const buscado = normalizarNombre(opciones.q ?? "");
  const filas = await db
    .select(COLUMNAS)
    .from(schema.activityCatalogOptions)
    .where(
      and(
        eq(schema.activityCatalogOptions.kind, opciones.kind),
        condicionVisibilidad(alcance),
        opciones.incluirArchivadas ? undefined : isNull(schema.activityCatalogOptions.archivedAt),
        buscado
          ? ilike(schema.activityCatalogOptions.normalizedName, `%${escaparLike(buscado)}%`)
          : undefined
      )
    )
    .orderBy(asc(schema.activityCatalogOptions.sortOrder), asc(schema.activityCatalogOptions.name))
    .limit(Math.min(Math.max(opciones.limite ?? 100, 1), 200));

  if (!opciones.conUsos || filas.length === 0) return filas.map((f) => aOpcion(f));

  const ids = filas.map((f) => f.id);
  const usos = new Map<string, number>();
  if (opciones.kind === "type") {
    const r = await db
      .select({ id: schema.eventReports.activityTypeId, n: count() })
      .from(schema.eventReports)
      .where(inArray(schema.eventReports.activityTypeId, ids))
      .groupBy(schema.eventReports.activityTypeId);
    for (const x of r) if (x.id) usos.set(x.id, Number(x.n));
  } else if (opciones.kind === "profile") {
    const r = await db
      .select({ id: schema.rapidActivityProspects.profileOptionId, n: count() })
      .from(schema.rapidActivityProspects)
      .where(inArray(schema.rapidActivityProspects.profileOptionId, ids))
      .groupBy(schema.rapidActivityProspects.profileOptionId);
    for (const x of r) if (x.id) usos.set(x.id, Number(x.n));
  } else {
    const r = await db
      .select({ id: schema.activityTagLinks.optionId, n: count() })
      .from(schema.activityTagLinks)
      .where(inArray(schema.activityTagLinks.optionId, ids))
      .groupBy(schema.activityTagLinks.optionId);
    for (const x of r) usos.set(x.id, Number(x.n));
  }
  return filas.map((f) => aOpcion(f, usos.get(f.id) ?? 0));
}

export async function obtenerOpcionVisible(
  id: string,
  alcance: UserNetworkScope
): Promise<OpcionCatalogo | null> {
  const db = getDatabaseClient();
  const [fila] = await db
    .select(COLUMNAS)
    .from(schema.activityCatalogOptions)
    .where(and(eq(schema.activityCatalogOptions.id, id), condicionVisibilidad(alcance)))
    .limit(1);
  return fila ? aOpcion(fila) : null;
}

/** Quién puede modificar una opción: administración, o quien creó una de red. */
export function puedeEditarOpcion(opcion: OpcionCatalogo, actorId: string, esAdmin: boolean): boolean {
  if (esAdmin) return true;
  return !opcion.isSystem && opcion.scope === "network" && opcion.createdByUserId === actorId;
}

export type ResultadoCreacion =
  | { estado: "creada" | "existente"; opcion: OpcionCatalogo; similares: OpcionCatalogo[] }
  | { estado: "invalida"; motivo: string };

const ERROR_UNICO = "23505";

function esViolacionUnica(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === ERROR_UNICO || e?.cause?.code === ERROR_UNICO;
}

/**
 * Crea una opción o devuelve la que ya coincide. `similares` trae las opciones visibles cuyo
 * nombre contiene al nuevo o al revés, para que la interfaz pueda avisar antes de duplicar.
 */
export async function crearOpcion(
  actor: { actorId: string; esAdmin: boolean },
  alcance: UserNetworkScope,
  entrada: {
    kind: TipoOpcion;
    name: string;
    description?: string | null | undefined;
    scope?: "organization" | "network" | undefined;
    incidentCategory?: string | undefined;
    color?: string | null | undefined;
    icon?: string | null | undefined;
  }
): Promise<ResultadoCreacion> {
  const nombre = entrada.name.replace(/\s+/g, " ").trim();
  if (nombre.length < 2) return { estado: "invalida", motivo: "El nombre necesita al menos 2 caracteres." };
  if (nombre.length > 80) return { estado: "invalida", motivo: "El nombre no puede pasar de 80 caracteres." };
  const descripcion = entrada.description?.trim() || null;
  if (descripcion && descripcion.length > 240) {
    return { estado: "invalida", motivo: "La descripción no puede pasar de 240 caracteres." };
  }

  // Solo administración crea opciones para toda la organización; el resto, para su red.
  const scope = actor.esAdmin && (entrada.scope ?? "organization") === "organization" ? "organization" : "network";

  const categoria = entrada.kind === "type" ? entrada.incidentCategory ?? "brigada" : "brigada";
  if (!esCategoriaValida(categoria)) {
    return { estado: "invalida", motivo: "La categoría para el mapa no es válida." };
  }

  const normalizado = normalizarNombre(nombre);
  const db = getDatabaseClient();

  const visibles = await db
    .select(COLUMNAS)
    .from(schema.activityCatalogOptions)
    .where(
      and(
        eq(schema.activityCatalogOptions.kind, entrada.kind),
        isNull(schema.activityCatalogOptions.archivedAt),
        condicionVisibilidad(alcance)
      )
    );

  const exacta = visibles.find((f) => normalizarNombre(f.name) === normalizado);
  const similaresDe = () =>
    visibles
      .filter((f) => {
        const n = normalizarNombre(f.name);
        return n !== normalizado && normalizado.length >= 3 && (n.includes(normalizado) || (n.length >= 3 && normalizado.includes(n)));
      })
      .slice(0, 5)
      .map((f) => aOpcion(f));

  if (exacta) return { estado: "existente", opcion: aOpcion(exacta), similares: similaresDe() };

  // Al final de la lista: sin esto todas las opciones nuevas entrarían con orden 0, es decir, primero.
  const [tope] = await db
    .select({ m: max(schema.activityCatalogOptions.sortOrder) })
    .from(schema.activityCatalogOptions)
    .where(eq(schema.activityCatalogOptions.kind, entrada.kind));

  const valores = {
    sortOrder: (tope?.m ?? 0) + 10,
    kind: entrada.kind,
    key: claveDesdeNombre(nombre),
    name: nombre,
    normalizedName: normalizado,
    description: descripcion,
    color: entrada.color ?? null,
    icon: entrada.icon ?? null,
    incidentCategory: categoria,
    scope,
    createdByUserId: actor.actorId
  } as const;

  try {
    const [creada] = await db.insert(schema.activityCatalogOptions).values(valores).returning(COLUMNAS);
    if (creada) {
      return { estado: "creada", opcion: aOpcion(creada), similares: similaresDe() };
    }
  } catch (error) {
    if (!esViolacionUnica(error)) throw error;
  }

  // Perdió la carrera: otra petición creó la misma opción entre la comprobación y el insert.
  const [ganadora] = await db
    .select(COLUMNAS)
    .from(schema.activityCatalogOptions)
    .where(
      and(
        eq(schema.activityCatalogOptions.kind, entrada.kind),
        eq(schema.activityCatalogOptions.normalizedName, normalizado),
        isNull(schema.activityCatalogOptions.archivedAt),
        condicionVisibilidad(alcance)
      )
    )
    .limit(1);
  if (!ganadora) throw new Error("No se pudo crear la opción ni encontrar la existente.");
  return { estado: "existente", opcion: aOpcion(ganadora), similares: [] };
}

export type CambiosOpcion = {
  name?: string | undefined;
  description?: string | null | undefined;
  color?: string | null | undefined;
  icon?: string | null | undefined;
  sortOrder?: number | undefined;
  incidentCategory?: string | undefined;
  archived?: boolean | undefined;
};

export type ResultadoEdicion =
  | { ok: true; opcion: OpcionCatalogo }
  | { ok: false; codigo: "no_encontrada" | "prohibido" | "invalida" | "duplicada"; motivo: string; existente?: OpcionCatalogo };

export async function editarOpcion(
  id: string,
  actor: { actorId: string; esAdmin: boolean },
  alcance: UserNetworkScope,
  cambios: CambiosOpcion
): Promise<ResultadoEdicion> {
  const actual = await obtenerOpcionVisible(id, alcance);
  if (!actual) return { ok: false, codigo: "no_encontrada", motivo: "La opción no existe." };
  if (!puedeEditarOpcion(actual, actor.actorId, actor.esAdmin)) {
    return {
      ok: false,
      codigo: "prohibido",
      motivo: actual.scope === "organization"
        ? "Las opciones de toda la organización las administra la administración."
        : "Solo quien creó la opción o la administración pueden modificarla."
    };
  }

  const set: Record<string, unknown> = { updatedAt: new Date() };

  if (cambios.name !== undefined) {
    const nombre = cambios.name.replace(/\s+/g, " ").trim();
    if (nombre.length < 2 || nombre.length > 80) {
      return { ok: false, codigo: "invalida", motivo: "El nombre debe tener entre 2 y 80 caracteres." };
    }
    const normalizado = normalizarNombre(nombre);
    if (normalizado !== normalizarNombre(actual.name)) {
      const otra = await buscarCoincidencia(actual.kind, normalizado, alcance, id);
      if (otra) {
        return { ok: false, codigo: "duplicada", motivo: `Ya existe una opción llamada «${otra.name}».`, existente: otra };
      }
    }
    set.name = nombre;
    set.normalizedName = normalizado;
  }
  if (cambios.description !== undefined) {
    const d = cambios.description?.trim() || null;
    if (d && d.length > 240) return { ok: false, codigo: "invalida", motivo: "La descripción no puede pasar de 240 caracteres." };
    set.description = d;
  }
  if (cambios.color !== undefined) set.color = cambios.color;
  if (cambios.icon !== undefined) set.icon = cambios.icon;
  if (cambios.sortOrder !== undefined) {
    if (!Number.isInteger(cambios.sortOrder) || cambios.sortOrder < 0 || cambios.sortOrder > 10_000) {
      return { ok: false, codigo: "invalida", motivo: "El orden debe ser un entero entre 0 y 10000." };
    }
    set.sortOrder = cambios.sortOrder;
  }
  if (cambios.incidentCategory !== undefined) {
    if (actual.kind !== "type" || !esCategoriaValida(cambios.incidentCategory)) {
      return { ok: false, codigo: "invalida", motivo: "La categoría para el mapa no es válida." };
    }
    set.incidentCategory = cambios.incidentCategory;
  }
  if (cambios.archived !== undefined) {
    if (cambios.archived) {
      set.archivedAt = new Date();
      set.archivedByUserId = actor.actorId;
    } else {
      // Restaurar puede chocar con una opción activa que tomó el mismo nombre mientras tanto.
      const otra = await buscarCoincidencia(actual.kind, normalizarNombre(actual.name), alcance, id);
      if (otra) {
        return { ok: false, codigo: "duplicada", motivo: `Ya existe una opción activa llamada «${otra.name}».`, existente: otra };
      }
      set.archivedAt = null;
      set.archivedByUserId = null;
    }
  }

  const db = getDatabaseClient();
  try {
    const [fila] = await db
      .update(schema.activityCatalogOptions)
      .set(set)
      .where(eq(schema.activityCatalogOptions.id, id))
      .returning(COLUMNAS);
    if (!fila) return { ok: false, codigo: "no_encontrada", motivo: "La opción no existe." };
    return { ok: true, opcion: aOpcion(fila) };
  } catch (error) {
    if (esViolacionUnica(error)) {
      return { ok: false, codigo: "duplicada", motivo: "Ya existe una opción activa con ese nombre." };
    }
    throw error;
  }
}

async function buscarCoincidencia(
  kind: TipoOpcion,
  normalizado: string,
  alcance: UserNetworkScope,
  excluirId: string
): Promise<OpcionCatalogo | null> {
  const db = getDatabaseClient();
  const [fila] = await db
    .select(COLUMNAS)
    .from(schema.activityCatalogOptions)
    .where(
      and(
        eq(schema.activityCatalogOptions.kind, kind),
        eq(schema.activityCatalogOptions.normalizedName, normalizado),
        isNull(schema.activityCatalogOptions.archivedAt),
        sql`${schema.activityCatalogOptions.id} <> ${excluirId}`,
        condicionVisibilidad(alcance)
      )
    )
    .limit(1);
  return fila ? aOpcion(fila) : null;
}

export type ResultadoFusion =
  | { ok: true; afectadas: number; aplicada: boolean }
  | { ok: false; motivo: string };

/**
 * Fusiona un duplicado en otra opción: las actividades pasan a la de destino y el duplicado se
 * archiva. Con `aplicar: false` solo cuenta lo que se vería afectado, para mostrarlo antes de
 * confirmar. Es una operación de administración porque reescribe actividades de otras redes.
 */
export async function fusionarOpciones(
  actor: { actorId: string; esAdmin: boolean },
  origenId: string,
  destinoId: string,
  aplicar: boolean
): Promise<ResultadoFusion> {
  if (!actor.esAdmin) return { ok: false, motivo: "Solo la administración puede fusionar opciones." };
  if (origenId === destinoId) return { ok: false, motivo: "El origen y el destino son la misma opción." };

  const db = getDatabaseClient();
  return db.transaction(async (tx) => {
    const filas = await tx
      .select(COLUMNAS)
      .from(schema.activityCatalogOptions)
      .where(inArray(schema.activityCatalogOptions.id, [origenId, destinoId]));
    const origen = filas.find((f) => f.id === origenId);
    const destino = filas.find((f) => f.id === destinoId);
    if (!origen || !destino) return { ok: false as const, motivo: "Una de las opciones no existe." };
    if (origen.kind !== destino.kind) return { ok: false as const, motivo: "Solo se fusionan opciones del mismo tipo." };
    if (destino.archivedAt) return { ok: false as const, motivo: "El destino está archivado." };

    let afectadas: number;
    if (origen.kind === "type") {
      const [fila] = await tx
        .select({ n: count() })
        .from(schema.eventReports)
        .where(eq(schema.eventReports.activityTypeId, origenId));
      afectadas = Number(fila?.n ?? 0);
      if (aplicar) {
        await tx
          .update(schema.eventReports)
          .set({ activityTypeId: destinoId, updatedAt: new Date() })
          .where(eq(schema.eventReports.activityTypeId, origenId));
      }
    } else if (origen.kind === "profile") {
      const [fila] = await tx
        .select({ n: count() })
        .from(schema.rapidActivityProspects)
        .where(eq(schema.rapidActivityProspects.profileOptionId, origenId));
      afectadas = Number(fila?.n ?? 0);
      if (aplicar) {
        await tx
          .update(schema.rapidActivityProspects)
          .set({ profileOptionId: destinoId, updatedAt: new Date() })
          .where(eq(schema.rapidActivityProspects.profileOptionId, origenId));
      }
    } else {
      const [fila] = await tx
        .select({ n: count() })
        .from(schema.activityTagLinks)
        .where(eq(schema.activityTagLinks.optionId, origenId));
      afectadas = Number(fila?.n ?? 0);
      if (aplicar) {
        // Una actividad que ya tenía ambas etiquetas no debe quedar con la del destino repetida.
        await tx.execute(sql`
          INSERT INTO activity_tag_links (event_report_id, option_id)
          SELECT event_report_id, ${destinoId}::uuid FROM activity_tag_links WHERE option_id = ${origenId}::uuid
          ON CONFLICT DO NOTHING`);
        await tx.delete(schema.activityTagLinks).where(eq(schema.activityTagLinks.optionId, origenId));
      }
    }

    if (aplicar) {
      await tx
        .update(schema.activityCatalogOptions)
        .set({ archivedAt: new Date(), archivedByUserId: actor.actorId, updatedAt: new Date() })
        .where(eq(schema.activityCatalogOptions.id, origenId));
      await tx.insert(schema.auditLogs).values({
        actorUserId: actor.actorId,
        action: "agenda.catalog.merge",
        entityType: "activity_catalog_option",
        entityId: origenId,
        correlationId: crypto.randomUUID(),
        beforeData: { origen: origen.name, activities: afectadas },
        afterData: { destinoId, destino: destino.name }
      });
    }
    return { ok: true as const, afectadas, aplicada: aplicar };
  });
}
