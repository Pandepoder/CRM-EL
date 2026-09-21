import { decryptData, schema } from "@tonala/shared/database";
import type { ActorContext } from "@tonala/shared/auth";
import { and, desc, eq, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { normalizarNombre } from "@/lib/actividades";
import { condicionVisibilidad } from "@/lib/catalogo-actividades";
import { contactIdRestriction, visibleContactIds } from "@/lib/contact-visibility";
import { getDatabaseClient } from "@/lib/db-client";
import { resolveUserNetworkScope, type UserNetworkScope } from "@/lib/network-hierarchy";
import { puedeVerContacto } from "@/lib/permisos-contacto";
import { esDisposicionValida, type PosibleContacto, type ProspectoItem } from "@/lib/prospectos";

/**
 * Prospectos (registro rápido de personas conocidas en una actividad).
 *
 * Alcance: cada persona ve los prospectos que registró ella y los de su alcance de red (la misma
 * cascada que el resto de la aplicación); administración ve todos.
 *
 * Convertir un prospecto en contacto es UNA operación: se bloquea la fila, se crea (o se enlaza)
 * el contacto, se guarda la nota con lo acordado y se marca el prospecto, todo en la misma
 * transacción. Dos solicitudes simultáneas no crean dos contactos: la segunda espera el bloqueo,
 * ve que ya está convertido y devuelve ese mismo contacto.
 */

export type Fallo = { ok: false; status: number; code: string; message: string };
const fallo = (status: number, code: string, message: string): Fallo => ({ ok: false, status, code, message });

export const TAMANO_PAGINA_PROSPECTOS = 20;

export type FiltrosProspectos = {
  q: string;
  disposicion: string | null;
  perfilId: string | null;
  estado: "pendientes" | "convertidos" | null;
  pagina: number;
};

function personasVisibles(alcance: UserNetworkScope): string[] | null {
  return alcance.isGlobal ? null : alcance.allowedUserIds ?? [];
}

function comodin(texto: string) {
  return `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

const P = schema.rapidActivityProspects;

export async function listarProspectos(
  alcance: UserNetworkScope,
  f: FiltrosProspectos
): Promise<{ items: ProspectoItem[]; total: number; pagina: number; tamano: number }> {
  const db = getDatabaseClient();
  const personas = personasVisibles(alcance);
  const donde = and(
    personas === null ? undefined : inArray(P.createdByUserId, personas),
    f.q ? or(ilike(P.prospectName, comodin(f.q)), ilike(P.organizationOrReference, comodin(f.q)), ilike(P.locationText, comodin(f.q))) : undefined,
    f.disposicion ? eq(P.disposition, f.disposicion) : undefined,
    f.perfilId ? eq(P.profileOptionId, f.perfilId) : undefined,
    f.estado === "pendientes" ? isNull(P.convertedToContactId) : f.estado === "convertidos" ? isNotNull(P.convertedToContactId) : undefined
  );

  const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(P).where(donde);
  const filas = await db
    .select({
      p: P,
      creador: schema.userProfiles.displayName,
      perfil: schema.activityCatalogOptions.name
    })
    .from(P)
    .leftJoin(schema.userProfiles, eq(P.createdByUserId, schema.userProfiles.id))
    .leftJoin(schema.activityCatalogOptions, eq(P.profileOptionId, schema.activityCatalogOptions.id))
    .where(donde)
    .orderBy(desc(P.activityDate), desc(P.createdAt))
    .limit(TAMANO_PAGINA_PROSPECTOS)
    .offset((f.pagina - 1) * TAMANO_PAGINA_PROSPECTOS);

  const items: ProspectoItem[] = filas.map(({ p, creador, perfil }) => ({
    id: p.id,
    prospectName: p.prospectName,
    organizationOrReference: p.organizationOrReference,
    profileType: p.profileType,
    profileOptionId: p.profileOptionId,
    profileName: perfil ?? p.profileType,
    disposition: p.disposition,
    dispositionNotes: p.dispositionNotes,
    activityDate: p.activityDate.toISOString(),
    locationText: p.locationText,
    commitments: p.commitments,
    privateNotes: p.privateNotes,
    nextStep: p.nextStep,
    nextStepAt: p.nextStepAt ? p.nextStepAt.toISOString() : null,
    convertedToContactId: p.convertedToContactId,
    convertedAt: p.convertedAt ? p.convertedAt.toISOString() : null,
    createdByUserId: p.createdByUserId,
    createdByName: creador,
    createdAt: p.createdAt.toISOString(),
    puedeEditar: !p.convertedToContactId
  }));
  return { items, total: n, pagina: f.pagina, tamano: TAMANO_PAGINA_PROSPECTOS };
}

export type EntradaProspecto = {
  prospectName?: string | undefined;
  organizationOrReference?: string | null | undefined;
  profileOptionId?: string | null | undefined;
  disposition?: string | undefined;
  dispositionNotes?: string | null | undefined;
  activityDate?: string | undefined;
  locationText?: string | null | undefined;
  commitments?: string | null | undefined;
  privateNotes?: string | null | undefined;
  nextStep?: string | null | undefined;
  nextStepAt?: string | null | undefined;
};

const recortar = (v: string | null | undefined, max: number) => {
  const t = v?.trim();
  return t ? t.slice(0, max) : null;
};

/** Valida y normaliza lo capturado; devuelve las columnas a escribir o el fallo. */
async function prepararColumnas(
  alcance: UserNetworkScope,
  e: EntradaProspecto,
  esAlta: boolean
): Promise<{ ok: true; cols: Partial<typeof P.$inferInsert> } | Fallo> {
  const cols: Partial<typeof P.$inferInsert> = {};

  if (e.prospectName !== undefined || esAlta) {
    const nombre = (e.prospectName ?? "").replace(/\s+/g, " ").trim();
    if (nombre.length < 2) return fallo(400, "nombre_requerido", "El nombre del prospecto es obligatorio.");
    if (nombre.length > 160) return fallo(400, "nombre_largo", "El nombre no puede pasar de 160 caracteres.");
    cols.prospectName = nombre;
  }
  if (e.disposition !== undefined) {
    if (!esDisposicionValida(e.disposition)) return fallo(400, "disposicion_invalida", "La disposición no es válida.");
    cols.disposition = e.disposition;
  }
  if (e.organizationOrReference !== undefined) cols.organizationOrReference = recortar(e.organizationOrReference, 200);
  if (e.dispositionNotes !== undefined) cols.dispositionNotes = recortar(e.dispositionNotes, 2000);
  if (e.locationText !== undefined) cols.locationText = recortar(e.locationText, 240);
  if (e.commitments !== undefined) cols.commitments = recortar(e.commitments, 2000);
  if (e.privateNotes !== undefined) cols.privateNotes = recortar(e.privateNotes, 4000);
  if (e.nextStep !== undefined) cols.nextStep = recortar(e.nextStep, 500);

  if (e.activityDate !== undefined) {
    const d = new Date(e.activityDate);
    if (Number.isNaN(d.getTime())) return fallo(400, "fecha_invalida", "La fecha de la conversación no es válida.");
    if (d.getTime() > Date.now() + 5 * 60_000) return fallo(400, "fecha_futura", "La conversación ya ocurrió: no puede tener fecha futura.");
    cols.activityDate = d;
  }
  if (e.nextStepAt !== undefined) {
    if (e.nextStepAt === null || e.nextStepAt === "") cols.nextStepAt = null;
    else {
      const d = new Date(e.nextStepAt);
      if (Number.isNaN(d.getTime())) return fallo(400, "fecha_invalida", "La fecha del próximo paso no es válida.");
      cols.nextStepAt = d;
    }
  }
  if (e.profileOptionId !== undefined) {
    if (e.profileOptionId === null || e.profileOptionId === "") {
      cols.profileOptionId = null;
    } else {
      const db = getDatabaseClient();
      const [op] = await db
        .select({ id: schema.activityCatalogOptions.id, key: schema.activityCatalogOptions.key, name: schema.activityCatalogOptions.name })
        .from(schema.activityCatalogOptions)
        .where(and(
          eq(schema.activityCatalogOptions.id, e.profileOptionId),
          eq(schema.activityCatalogOptions.kind, "profile"),
          isNull(schema.activityCatalogOptions.archivedAt),
          condicionVisibilidad(alcance)
        ))
        .limit(1);
      if (!op) return fallo(400, "perfil_invalido", "El perfil no existe, está archivado o no está disponible para ti.");
      cols.profileOptionId = op.id;
      // El texto se conserva junto al vínculo: si la opción se archiva o cambia, el prospecto no se rompe.
      cols.profileType = op.key;
    }
  }
  return { ok: true, cols };
}

export async function crearProspecto(actor: ActorContext, e: EntradaProspecto) {
  const alcance = await resolveUserNetworkScope(actor.actorId);
  const c = await prepararColumnas(alcance, e, true);
  if (!c.ok) return c;
  const db = getDatabaseClient();
  const [fila] = await db
    .insert(P)
    .values({
      prospectName: c.cols.prospectName!,
      createdByUserId: actor.actorId,
      ...c.cols,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();
  return { ok: true as const, prospecto: fila! };
}

async function cargarVisible(id: string, alcance: UserNetworkScope) {
  const db = getDatabaseClient();
  const [p] = await db.select().from(P).where(eq(P.id, id)).limit(1);
  const personas = personasVisibles(alcance);
  // 404 y no 403: confirmar que el identificador existe ya es información sobre el trabajo ajeno.
  if (!p || (personas !== null && !personas.includes(p.createdByUserId))) return null;
  return p;
}

export async function editarProspecto(actor: ActorContext, id: string, e: EntradaProspecto) {
  const alcance = await resolveUserNetworkScope(actor.actorId);
  const p = await cargarVisible(id, alcance);
  if (!p) return fallo(404, "no_encontrado", "Prospecto no encontrado.");
  if (p.convertedToContactId) return fallo(409, "ya_convertido", "Este prospecto ya es un contacto: edítalo desde su ficha.");
  const c = await prepararColumnas(alcance, e, false);
  if (!c.ok) return c;
  const db = getDatabaseClient();
  const [fila] = await db.update(P).set({ ...c.cols, updatedAt: new Date() }).where(and(eq(P.id, id), isNull(P.convertedToContactId))).returning();
  if (!fila) return fallo(409, "ya_convertido", "Este prospecto ya es un contacto: edítalo desde su ficha.");
  return { ok: true as const, prospecto: fila };
}

/**
 * Contactos visibles que podrían ser esta misma persona: comparten al menos dos palabras del
 * nombre (o el nombre completo si solo tiene una). No se fusiona nada solo por parecerse: la
 * persona decide.
 */
export async function posiblesContactos(alcance: UserNetworkScope, nombre: string): Promise<PosibleContacto[]> {
  const palabras = normalizarNombre(nombre).split(" ").filter((w) => w.length >= 3);
  if (palabras.length === 0) return [];
  const db = getDatabaseClient();
  const visibles = contactIdRestriction(await visibleContactIds(alcance));
  const candidatos = await db
    .select({ id: schema.contacts.id, nombre: schema.contacts.displayName, colony: schema.contacts.colony })
    .from(schema.contacts)
    .where(and(eq(schema.contacts.status, "active"), visibles, or(...palabras.map((w) => ilike(schema.contacts.displayName, comodin(w))))))
    .limit(200);

  const requeridas = Math.min(2, palabras.length);
  return candidatos
    .filter((c) => {
      const propias = new Set(normalizarNombre(c.nombre).split(" "));
      return palabras.filter((w) => propias.has(w)).length >= requeridas;
    })
    .slice(0, 8)
    .map((c) => ({ id: c.id, nombre: c.nombre, detalle: decryptData(c.colony) || null }));
}

export async function revisarConversion(actor: ActorContext, id: string) {
  const alcance = await resolveUserNetworkScope(actor.actorId);
  const p = await cargarVisible(id, alcance);
  if (!p) return fallo(404, "no_encontrado", "Prospecto no encontrado.");
  if (p.convertedToContactId) return { ok: true as const, yaConvertido: true, contactId: p.convertedToContactId, posibles: [] as PosibleContacto[] };
  return { ok: true as const, yaConvertido: false, contactId: null, posibles: await posiblesContactos(alcance, p.prospectName) };
}

export type ResultadoConversion =
  | { ok: true; contactId: string; yaConvertido: boolean; creado: boolean }
  | Fallo
  | { ok: false; status: 409; code: "posibles_duplicados"; message: string; posibles: PosibleContacto[] };

export async function convertirProspecto(
  actor: ActorContext,
  id: string,
  opciones: { contactoExistenteId?: string | undefined; confirmarNuevo?: boolean | undefined }
): Promise<ResultadoConversion> {
  const alcance = await resolveUserNetworkScope(actor.actorId);

  if (opciones.contactoExistenteId) {
    if (!(await puedeVerContacto(opciones.contactoExistenteId, actor.actorId, actor.roles))) {
      return fallo(404, "contacto_no_encontrado", "Ese contacto no pertenece a tu brigada.");
    }
  }

  // Sin decisión explícita, si hay parecidos se pide revisarlos antes de crear otro contacto.
  if (!opciones.contactoExistenteId && !opciones.confirmarNuevo) {
    const previo = await cargarVisible(id, alcance);
    if (!previo) return fallo(404, "no_encontrado", "Prospecto no encontrado.");
    if (!previo.convertedToContactId) {
      const posibles = await posiblesContactos(alcance, previo.prospectName);
      if (posibles.length > 0) {
        return { ok: false, status: 409, code: "posibles_duplicados", message: "Ya hay contactos parecidos. Elige uno o confirma que es una persona nueva.", posibles };
      }
    }
  }

  const db = getDatabaseClient();
  return db.transaction(async (tx): Promise<ResultadoConversion> => {
    // El bloqueo de fila serializa las conversiones simultáneas del mismo prospecto.
    const [p] = await tx.select().from(P).where(eq(P.id, id)).for("update");
    const personas = personasVisibles(alcance);
    if (!p || (personas !== null && !personas.includes(p.createdByUserId))) {
      return fallo(404, "no_encontrado", "Prospecto no encontrado.");
    }
    if (p.convertedToContactId) {
      return { ok: true, contactId: p.convertedToContactId, yaConvertido: true, creado: false };
    }

    const ahora = new Date();
    const contactId = opciones.contactoExistenteId ?? crypto.randomUUID();
    const creado = !opciones.contactoExistenteId;

    if (creado) {
      const palabras = p.prospectName.trim().split(/\s+/);
      await tx.insert(schema.contacts).values({
        id: contactId,
        displayName: p.prospectName,
        status: "active",
        createdByUserId: actor.actorId,
        // La procedencia se conserva: quien conoció a la persona es quien la refiere.
        referredByUserId: p.createdByUserId,
        actualContactUserId: actor.actorId,
        firstName: palabras[0] ?? p.prospectName,
        lastName: palabras.slice(1).join(" "),
        profession: p.organizationOrReference || "Prospecto",
        interests: `Perfil ${p.profileType}`,
        origin: "toca_toca",
        firstContactDate: p.activityDate,
        // El registro rápido captura un lugar libre, no una colonia: se guarda como domicilio y la
        // colonia queda pendiente en lugar de suponerla.
        address: p.locationText,
        colony: "Por identificar",
        municipality: null,
        knowMeBetter: p.dispositionNotes || null,
        createdAt: ahora,
        version: 1
      });
    }

    const partes = [
      `${creado ? "Convertido" : "Vinculado"} desde el registro rápido «${p.prospectName}» del ${p.activityDate.toISOString().slice(0, 10)}.`,
      p.commitments ? `Acuerdos: ${p.commitments}.` : null,
      p.privateNotes ? `Notas internas: ${p.privateNotes}.` : null,
      p.nextStep ? `Próximo paso: ${p.nextStep}${p.nextStepAt ? ` (${p.nextStepAt.toISOString().slice(0, 10)})` : ""}.` : null,
      `Disposición: ${p.disposition}.`
    ].filter(Boolean);
    await tx.insert(schema.contactNotes).values({ contactId, authorUserId: actor.actorId, noteText: partes.join(" "), createdAt: ahora });

    await tx
      .update(P)
      .set({ convertedToContactId: contactId, convertedAt: ahora, convertedByUserId: actor.actorId, updatedAt: ahora })
      .where(and(eq(P.id, id), isNull(P.convertedToContactId)));

    await tx.insert(schema.auditLogs).values({
      actorUserId: actor.actorId,
      action: "prospect.convert",
      entityType: "rapid_activity_prospect",
      entityId: id,
      correlationId: actor.correlationId,
      beforeData: { convertedToContactId: null },
      afterData: { contactId, creado }
    });
    return { ok: true, contactId, yaConvertido: false, creado };
  });
}
