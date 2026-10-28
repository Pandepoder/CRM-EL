import { and, count, desc, eq, isNotNull, or, sql, type SQL } from "drizzle-orm";

import type { ActorContext } from "@tonala/shared/auth";
import { patronDeBusqueda, schema, sinAcentosSql } from "@tonala/shared/database";

import { condicionParaTrabajarPorAutor, condicionPorAutor } from "./alcance-municipal";
import { motivoSiAdjuntosAjenos } from "./archivos";
import { contactIdRestriction, contactosVisibles, veCiudadano } from "./contact-visibility";
import { getDatabaseClient } from "./db-client";
import {
  esCategoriaEscucha,
  esEstadoEscucha,
  LARGO_MAXIMO_DESCRIPCION_ESCUCHA,
  LARGO_MAXIMO_NOTAS_ESCUCHA,
  LARGO_MAXIMO_TITULO_ESCUCHA,
  MAXIMO_DE_FOTOS_ESCUCHA,
  POR_PAGINA_PETICIONES,
  type FilaDePeticion,
  type FiltrosDePeticiones,
  type PeticionDelVecino,
  type PuntoDePeticion,
  type ResultadoDePeticiones,
  type TurnoDeGestion,
  fechaDeTurno,
  tituloDesdeTexto
} from "./escucha-social";
import { esUuid } from "./ids";
import { crearUnaSolaVez } from "./idempotencia";
import type { UserNetworkScope } from "./network-hierarchy";

/**
 * Escucha Social (plan de auditoría de menús, fase 3): lo que pide o propone un vecino, ligado a él, con su
 * seguimiento y, si administración lo turna, a qué dependencia.
 *
 * Quién ve qué es la regla de siempre (`condicionPorAutor`): el maestro todo; la administración municipal su
 * municipio y su gente; el resto, lo que anotó su estructura. Quién la trabaja: `condicionParaTrabajarPorAutor`
 * (ver no es trabajar). El nombre del vecino solo llega a quien puede ver su ficha: se recorta aquí, en el
 * servidor, con la misma condición del Directorio.
 */

export type Fallo = { ok: false; status: number; error: string; campo?: string };
const fallo = (status: number, error: string, campo?: string): Fallo => ({ ok: false, status, error, ...(campo ? { campo } : {}) });

const sl = schema.socialListening;

function turnoDe(f: { dependencia: string | null; folio: string | null; turnada: Date | null; formal: number }): TurnoDeGestion | null {
  if (f.formal !== 1) return null;
  return { dependencia: f.dependencia, folio: f.folio, fecha: f.turnada ? f.turnada.toISOString() : null };
}

async function columnasDeFila(alcance: UserNetworkScope) {
  const visiblesCiudadanos = contactIdRestriction(await contactosVisibles(alcance), sl.contactId);
  const trabajable = condicionParaTrabajarPorAutor(alcance, sl.municipalityId, sl.createdByUserId);
  return {
    id: sl.id,
    titulo: sl.title,
    descripcion: sl.description,
    categorias: sl.categories,
    estado: sl.status,
    creada: sl.createdAt,
    autorId: sl.createdByUserId,
    autorNombre: schema.userProfiles.displayName,
    contactoId: sl.contactId,
    // El nombre del vecino solo si quien mira puede ver su ficha (`contactIdRestriction`, como el Directorio).
    vecinoNombre: visiblesCiudadanos
      ? sql<string | null>`CASE WHEN ${visiblesCiudadanos} THEN ${schema.contacts.displayName} END`
      : schema.contacts.displayName,
    lugar: sl.locationText,
    latitud: sl.latitude,
    longitud: sl.longitude,
    fotos: sl.photoUrls,
    notas: sl.resolutionNotes,
    formal: sl.isFormalGestion,
    dependencia: sl.gestionDependencia,
    folio: sl.gestionFolio,
    turnada: sl.gestionTurnadaAt,
    puedeTrabajar: trabajable ? sql<boolean>`coalesce((${trabajable}), false)` : sql<boolean>`true`
  };
}

/** La primera categoría guardada: la columna es una lista JSON; en registros viejos, a veces un texto suelto. */
function primeraCategoria(valor: unknown): string {
  const primera: unknown = Array.isArray(valor) ? valor[0] : valor;
  return typeof primera === "string" ? primera : "";
}

function aFila(r: Record<string, unknown>, alcance: UserNetworkScope): FilaDePeticion {
  const visibles = new Set(alcance.allowedUserIds ?? []);
  const autorId = r.autorId as string;
  return {
    id: r.id as string,
    titulo: r.titulo as string,
    descripcion: r.descripcion as string,
    categoria: primeraCategoria(r.categorias),
    estado: r.estado as string,
    creada: (r.creada as Date).toISOString(),
    autor: alcance.isMaster || visibles.has(autorId) ? ((r.autorNombre as string | null) ?? null) : null,
    esMia: autorId === alcance.userId,
    vecino: r.contactoId && r.vecinoNombre ? { id: r.contactoId as string, nombre: r.vecinoNombre as string } : null,
    vecinoOculto: Boolean(r.contactoId) && !r.vecinoNombre,
    lugar: (r.lugar as string | null) ?? null,
    latitud: r.latitud === null || r.latitud === undefined ? null : Number(r.latitud),
    longitud: r.longitud === null || r.longitud === undefined ? null : Number(r.longitud),
    fotos: Array.isArray(r.fotos) ? (r.fotos as string[]) : [],
    notas: (r.notas as string | null) ?? null,
    turno: turnoDe({ dependencia: r.dependencia as string | null, folio: r.folio as string | null, turnada: r.turnada as Date | null, formal: Number(r.formal) }),
    puedeTrabajar: Boolean(r.puedeTrabajar)
  };
}

/** Las peticiones de la pantalla, por páginas y con los filtros resueltos en la base. */
export async function listarPeticiones(alcance: UserNetworkScope, f: FiltrosDePeticiones): Promise<ResultadoDePeticiones> {
  const db = getDatabaseClient();
  const visibles = condicionPorAutor(alcance, sl.municipalityId, sl.createdByUserId);
  const texto = f.q.trim();
  const condicion = and(
    visibles,
    f.vista === "turnadas" ? eq(sl.isFormalGestion, 1) : f.vista !== "todas" ? sql`${sl.categories} @> ${JSON.stringify([f.vista])}::jsonb` : undefined,
    f.estado ? eq(sl.status, f.estado) : undefined,
    f.mias ? eq(sl.createdByUserId, alcance.userId) : undefined,
    texto
      ? or(
          sql`${sinAcentosSql(sl.title)} LIKE ${patronDeBusqueda(texto)}`,
          sql`${sinAcentosSql(sl.description)} LIKE ${patronDeBusqueda(texto)}`,
          sql`${sinAcentosSql(sql`coalesce(${sl.locationText}, '')`)} LIKE ${patronDeBusqueda(texto)}`
        )
      : undefined
  );

  const [[conteo], [pendientes]] = await Promise.all([
    db.select({ total: count() }).from(sl).where(condicion),
    db.select({ total: count() }).from(sl).where(and(visibles, eq(sl.status, "pendiente")))
  ]);
  const total = conteo?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA_PETICIONES));
  const pagina = Math.min(f.pagina, totalPaginas);

  const filas = await db
    .select(await columnasDeFila(alcance))
    .from(sl)
    .leftJoin(schema.userProfiles, eq(sl.createdByUserId, schema.userProfiles.id))
    .leftJoin(schema.contacts, eq(sl.contactId, schema.contacts.id))
    .where(condicion)
    .orderBy(desc(sl.createdAt), desc(sl.id))
    .limit(POR_PAGINA_PETICIONES)
    .offset((pagina - 1) * POR_PAGINA_PETICIONES);

  return { filas: filas.map((r) => aFila(r as Record<string, unknown>, alcance)), total, pagina, totalPaginas, pendientes: pendientes?.total ?? 0 };
}

/** Una petición por su id, si quien mira la ve (para abrirla desde el mapa o la ficha). */
export async function obtenerPeticion(alcance: UserNetworkScope, id: string): Promise<FilaDePeticion | null> {
  if (!esUuid(id)) return null;
  const [fila] = await getDatabaseClient()
    .select(await columnasDeFila(alcance))
    .from(sl)
    .leftJoin(schema.userProfiles, eq(sl.createdByUserId, schema.userProfiles.id))
    .leftJoin(schema.contacts, eq(sl.contactId, schema.contacts.id))
    .where(and(eq(sl.id, id), condicionPorAutor(alcance, sl.municipalityId, sl.createdByUserId)))
    .limit(1);
  return fila ? aFila(fila, alcance) : null;
}

export type EntradaDePeticion = {
  titulo: unknown;
  descripcion: unknown;
  categorias: unknown;
  contactoId?: unknown;
  lugar?: unknown;
  latitud?: unknown;
  longitud?: unknown;
  fotos?: unknown;
  clientRequestId?: unknown;
};

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const numeroOpcional = (v: unknown): number | null | "malo" => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : "malo";
};

/** Anotar una petición. Sin señal, la cola la reenvía con la misma clave y se guarda una sola vez. */
export async function crearPeticion(actor: ActorContext, alcance: UserNetworkScope, e: EntradaDePeticion) {
  const descripcion = texto(e.descripcion);
  if (!descripcion) return fallo(400, "Cuenta qué te pidieron.", "description");
  if (descripcion.length > LARGO_MAXIMO_DESCRIPCION_ESCUCHA) return fallo(400, `La descripción va hasta ${LARGO_MAXIMO_DESCRIPCION_ESCUCHA} caracteres.`, "description");
  // La frase es opcional: sin ella, la primera oración del texto (§7.2, límite de toques).
  const titulo = texto(e.titulo) || tituloDesdeTexto(descripcion);
  if (titulo.length > LARGO_MAXIMO_TITULO_ESCUCHA) return fallo(400, `La frase va hasta ${LARGO_MAXIMO_TITULO_ESCUCHA} caracteres.`, "title");

  // Solo categorías del catálogo: una inventada se pintaba como «Idea / Propuesta» (A4).
  const categorias: unknown[] = Array.isArray(e.categorias) ? e.categorias : e.categorias === undefined ? ["propuesta"] : [e.categorias];
  if (categorias.length === 0 || categorias.length > 5 || !categorias.every(esCategoriaEscucha)) {
    return fallo(400, "Elige una categoría de la lista.", "categories");
  }

  const latitud = numeroOpcional(e.latitud);
  const longitud = numeroOpcional(e.longitud);
  if (latitud === "malo" || longitud === "malo" || (latitud !== null && Math.abs(latitud) > 90) || (longitud !== null && Math.abs(longitud) > 180)) {
    return fallo(400, "La ubicación no es válida. Vuelve a marcarla en el mapa.", "latitude");
  }

  // Fotos: solo las que subió quien anota, y solo fotos. Una URL ajena dejaría esa foto a la vista de toda su
  // cadena de mando (A12, `lib/archivos.ts`).
  const fotos = e.fotos === undefined ? [] : e.fotos;
  if (!Array.isArray(fotos) || fotos.some((u) => typeof u !== "string")) return fallo(400, "Las fotos no tienen el formato esperado.", "photoUrls");
  if (fotos.length > MAXIMO_DE_FOTOS_ESCUCHA) return fallo(400, `Se pueden adjuntar hasta ${MAXIMO_DE_FOTOS_ESCUCHA} fotos.`, "photoUrls");
  const fotosAjenas = await motivoSiAdjuntosAjenos(actor.actorId, fotos as string[], [], { soloImagenes: true });
  if (fotosAjenas) return fallo(400, fotosAjenas, "photoUrls");

  // Ligarla a un vecino que no se ve la colaría en su historial y dejaría su ficha a la vista: 404, como si no
  // existiera (lo que no se ve no existe).
  let contactoId: string | null = null;
  if (e.contactoId !== undefined && e.contactoId !== null && e.contactoId !== "") {
    if (!esUuid(e.contactoId) || !(await veCiudadano(alcance, e.contactoId))) return fallo(404, "Este ciudadano no pertenece a tu brigada.", "contactId");
    contactoId = e.contactoId;
  }

  const clave = e.clientRequestId === undefined || e.clientRequestId === null || e.clientRequestId === "" ? null : e.clientRequestId;
  if (clave !== null && !esUuid(clave)) return fallo(400, "La clave de la solicitud no es válida.", "clientRequestId");

  const db = getDatabaseClient();
  const r = await crearUnaSolaVez({
    clave,
    indice: "social_listening_client_request_idx",
    buscar: async (c: string) => (await db.select().from(sl).where(eq(sl.clientRequestId, c)).limit(1))[0],
    creadaPor: (fila) => fila.createdByUserId,
    quien: actor.actorId,
    crear: async () => {
      const [fila] = await db
        .insert(sl)
        .values({
          contactId: contactoId,
          categories: categorias,
          title: titulo,
          description: descripcion,
          photoUrls: fotos as string[],
          latitude: latitud,
          longitude: longitud,
          locationText: texto(e.lugar).slice(0, 300) || null,
          status: "pendiente",
          // La gestión formal nace en cero: la marca solo la pone administración al turnar (D6).
          isFormalGestion: 0,
          createdByUserId: actor.actorId,
          clientRequestId: clave
        })
        .returning();
      return fila!;
    }
  });
  if (!r.ok) return fallo(409, "Esta solicitud ya se usó.", "clientRequestId");
  return { ok: true as const, peticion: r.fila, repetida: r.repetida };
}

async function auditar(actor: ActorContext, accion: string, id: string, antes: unknown, despues: unknown) {
  await getDatabaseClient().insert(schema.auditLogs).values({
    actorUserId: actor.actorId,
    action: accion,
    entityType: "social_listening",
    entityId: id,
    correlationId: actor.correlationId,
    beforeData: antes ?? null,
    afterData: despues ?? null
  });
}

/** La fila si quien actúa la ve (404 si no) y la puede trabajar (403 si solo la consulta). */
async function cargarParaTrabajar(alcance: UserNetworkScope, id: string) {
  if (!esUuid(id)) return { fallo: fallo(404, "Registro no encontrado") } as const;
  const db = getDatabaseClient();
  const [fila] = await db
    .select({ id: sl.id, estado: sl.status, notas: sl.resolutionNotes, formal: sl.isFormalGestion, dependencia: sl.gestionDependencia, folio: sl.gestionFolio })
    .from(sl)
    .where(and(eq(sl.id, id), condicionPorAutor(alcance, sl.municipalityId, sl.createdByUserId)))
    .limit(1);
  if (!fila) return { fallo: fallo(404, "Registro no encontrado") } as const;
  const [trabajable] = await db
    .select({ id: sl.id })
    .from(sl)
    .where(and(eq(sl.id, id), condicionParaTrabajarPorAutor(alcance, sl.municipalityId, sl.createdByUserId)))
    .limit(1);
  // Verlo no es trabajarlo (A20): el capturista ve lo de su brigada, pero el estado lo mueve quien lo
  // levantó o quien coordina.
  if (!trabajable) return { fallo: fallo(403, "Solo consulta: este registro lo atiende quien lo levantó o quien coordina su brigada.") } as const;
  return { fila } as const;
}

/** Cambiar el estado y las notas de seguimiento. Vaciar las notas las borra (A5). */
export async function cambiarPeticion(actor: ActorContext, alcance: UserNetworkScope, id: string, cambios: { status?: unknown; resolutionNotes?: unknown }) {
  const { status, resolutionNotes } = cambios;
  if (status !== undefined && !esEstadoEscucha(status)) return fallo(400, "Ese estado no existe. Elige pendiente, en seguimiento o cerrado.", "status");
  if (resolutionNotes !== undefined && resolutionNotes !== null && (typeof resolutionNotes !== "string" || resolutionNotes.length > LARGO_MAXIMO_NOTAS_ESCUCHA)) {
    return fallo(400, `Las notas de seguimiento no son válidas (hasta ${LARGO_MAXIMO_NOTAS_ESCUCHA} caracteres).`, "resolutionNotes");
  }
  if (status === undefined && resolutionNotes === undefined) return fallo(400, "No hay nada que actualizar.");

  const cargada = await cargarParaTrabajar(alcance, id);
  if ("fallo" in cargada) return cargada.fallo;
  const antes = cargada.fila;

  const cambia = status !== undefined && status !== antes.estado;
  const [actualizada] = await getDatabaseClient()
    .update(sl)
    .set({
      ...(status !== undefined ? { status } : {}),
      ...(resolutionNotes !== undefined ? { resolutionNotes: typeof resolutionNotes === "string" && resolutionNotes.trim() ? resolutionNotes.trim() : null } : {}),
      ...(cambia ? { statusChangedAt: new Date(), statusChangedByUserId: actor.actorId } : {}),
      updatedAt: new Date()
    })
    .where(eq(sl.id, id))
    .returning();
  if (!actualizada) return fallo(404, "Registro no encontrado");
  if (cambia) await auditar(actor, "social.status_change", id, { status: antes.estado }, { status });
  return { ok: true as const, peticion: actualizada };
}

/**
 * Turnar una gestión a una dependencia (D6), o quitarle el turno con `null`. Solo administración, sobre lo que
 * ve. Antes era una marca sin más («Gestión Formal Aprobada»): no decía a dónde se mandó ni cuándo.
 */
export async function turnarPeticion(
  actor: ActorContext,
  alcance: UserNetworkScope,
  id: string,
  turno: { dependencia?: unknown; folio?: unknown; fecha?: unknown } | null
) {
  if (!alcance.isAdmin) return fallo(403, "Solo administración turna las gestiones a una dependencia.");
  let dependencia: string | null = null;
  let folio: string | null = null;
  let fecha: Date | null = null;
  if (turno) {
    dependencia = texto(turno.dependencia);
    if (dependencia.length < 2 || dependencia.length > 120) return fallo(400, "Escribe a qué dependencia se turna.", "dependencia");
    folio = texto(turno.folio).slice(0, 60) || null;
    if (turno.fecha !== undefined && turno.fecha !== null && turno.fecha !== "") {
      const f = typeof turno.fecha === "string" ? fechaDeTurno(turno.fecha) : null;
      if (!f) return fallo(400, "La fecha no es válida.", "fecha");
      fecha = f;
    } else {
      fecha = new Date();
    }
  }

  const cargada = await cargarParaTrabajar(alcance, id);
  if ("fallo" in cargada) return cargada.fallo;
  const antes = cargada.fila;

  const [actualizada] = await getDatabaseClient()
    .update(sl)
    .set({
      isFormalGestion: turno ? 1 : 0,
      approvedByUserId: turno ? actor.actorId : null,
      gestionDependencia: dependencia,
      gestionFolio: folio,
      gestionTurnadaAt: fecha,
      updatedAt: new Date()
    })
    .where(eq(sl.id, id))
    .returning();
  if (!actualizada) return fallo(404, "Registro no encontrado");
  await auditar(
    actor,
    turno ? "social.turn" : "social.unturn",
    id,
    { formal: antes.formal, dependencia: antes.dependencia, folio: antes.folio },
    { formal: turno ? 1 : 0, dependencia, folio }
  );
  return { ok: true as const, peticion: actualizada };
}

/**
 * «Lo que ha pedido» en la ficha de un vecino (D10): todas sus peticiones, como la ficha ya enseña todas sus
 * notas, a quien puede ver al vecino. Las notas de seguimiento, solo de las que también ve en Escucha Social.
 * `null` si no puede ver al vecino.
 */
export async function peticionesDelVecino(alcance: UserNetworkScope, contactoId: string): Promise<PeticionDelVecino[] | null> {
  if (!esUuid(contactoId) || !(await veCiudadano(alcance, contactoId))) return null;
  const enEscucha: SQL = condicionPorAutor(alcance, sl.municipalityId, sl.createdByUserId) ?? sql`true`;
  const filas = await getDatabaseClient()
    .select({
      id: sl.id,
      titulo: sl.title,
      categorias: sl.categories,
      estado: sl.status,
      creada: sl.createdAt,
      formal: sl.isFormalGestion,
      dependencia: sl.gestionDependencia,
      folio: sl.gestionFolio,
      turnada: sl.gestionTurnadaAt,
      enEscucha: sql<boolean>`coalesce((${enEscucha}), false)`,
      notas: sql<string | null>`CASE WHEN ${enEscucha} THEN ${sl.resolutionNotes} END`
    })
    .from(sl)
    .where(eq(sl.contactId, contactoId))
    .orderBy(desc(sl.createdAt))
    .limit(50);
  return filas.map((f) => ({
    id: f.id,
    titulo: f.titulo,
    categoria: primeraCategoria(f.categorias),
    estado: f.estado,
    creada: f.creada.toISOString(),
    turno: turnoDe({ dependencia: f.dependencia, folio: f.folio, turnada: f.turnada, formal: f.formal }),
    notas: f.notas ?? null,
    enEscucha: Boolean(f.enEscucha)
  }));
}

/** La capa «Peticiones» del mapa: lo que ve quien mira, con ubicación, sin nombres ni teléfonos. */
export async function peticionesEnMapa(alcance: UserNetworkScope): Promise<PuntoDePeticion[]> {
  const filas = await getDatabaseClient()
    .select({ id: sl.id, categorias: sl.categories, estado: sl.status, latitud: sl.latitude, longitud: sl.longitude })
    .from(sl)
    .where(and(condicionPorAutor(alcance, sl.municipalityId, sl.createdByUserId), isNotNull(sl.latitude), isNotNull(sl.longitude)))
    .orderBy(desc(sl.createdAt))
    .limit(2000);
  return filas.map((f) => ({
    id: f.id,
    categoria: primeraCategoria(f.categorias),
    estado: f.estado,
    latitud: Number(f.latitud),
    longitud: Number(f.longitud)
  }));
}
