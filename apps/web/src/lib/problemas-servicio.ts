import { and, desc, eq, inArray, isNotNull, ne, or, sql, type SQL } from "drizzle-orm";

import type { ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import { motivoSiAdjuntosAjenos } from "@/lib/archivos";
import { getDatabaseClient } from "@/lib/db-client";
import { crearUnaSolaVez } from "@/lib/idempotencia";
import type { UserNetworkScope } from "@/lib/network-hierarchy";
import {
  esEstadoDeProblema,
  hayRespuestaNueva,
  LARGO_MAXIMO_RESPUESTA,
  lugaresParaReportar,
  puedeVerReporte,
  validarReporte,
  type DatosDelDispositivo,
  type EstadoDeProblema,
  type TipoDeProblema
} from "@/lib/problemas";

/**
 * Guardar, listar y contestar los reportes de problemas (§9 del plan de experiencia sencilla).
 *
 * Quién ve qué:
 * - quien reporta, los suyos, con su estado y la respuesta;
 * - administración, los de la gente de su alcance: el maestro, todos; un administrador municipal, los de
 *   las personas de su municipio; uno sin municipio, solo los suyos;
 * - nadie más: dirección y liderazgo no revisan reportes de la herramienta.
 */

export type Fallo = { ok: false; status: number; code: string; error: string; campo?: string };
const fallo = (status: number, code: string, error: string, campo?: string): Fallo => ({ ok: false, status, code, error, ...(campo ? { campo } : {}) });

/** Condición de los reportes que revisa administración; `null` si este alcance no revisa. */
function condicionDeRevision(alcance: UserNetworkScope): SQL | undefined | null {
  if (!alcance.isAdmin) return null;
  if (alcance.isMaster) return undefined;
  const personas = alcance.allowedUserIds ?? [alcance.userId];
  return inArray(schema.problemReports.createdByUserId, personas.length > 0 ? personas : [alcance.userId]);
}

export async function crearReporte(
  actor: ActorContext,
  alcance: UserNetworkScope,
  cuerpo: unknown
): Promise<{ ok: true; id: string; repetido: boolean } | Fallo> {
  const v = validarReporte(cuerpo, lugaresParaReportar(alcance.roleKey, alcance.isMaster));
  if (!v.ok) return fallo(400, "datos_invalidos", v.mensaje, v.campo);
  const e = v.entrada;

  if (e.foto) {
    const motivo = await motivoSiAdjuntosAjenos(actor.actorId, [e.foto], [], { soloImagenes: true });
    if (motivo) return fallo(400, "foto_invalida", motivo, "foto");
  }

  const db = getDatabaseClient();
  const r = await crearUnaSolaVez({
    clave: e.clientRequestId,
    indice: "problem_reports_client_request_idx",
    buscar: async (clave) =>
      (await db.select().from(schema.problemReports).where(eq(schema.problemReports.clientRequestId, clave)).limit(1))[0],
    crear: async () => {
      const [fila] = await db
        .insert(schema.problemReports)
        .values({
          createdByUserId: actor.actorId,
          place: e.lugar,
          placeLabel: e.lugarEtiqueta,
          kind: e.tipo,
          description: e.descripcion,
          photoUrl: e.foto,
          pagePath: e.ruta,
          errorMessage: e.error,
          device: e.dispositivo,
          clientRequestId: e.clientRequestId
        })
        .returning();
      return fila!;
    },
    creadaPor: (fila) => fila.createdByUserId,
    quien: actor.actorId
  });
  if (!r.ok) return fallo(409, "solicitud_repetida", "Ese reporte ya lo envió otra persona. Vuelve a abrir el formulario.");
  return { ok: true, id: r.fila.id, repetido: r.repetida };
}

export type ReporteParaQuienReporta = {
  id: string;
  lugar: string;
  tipo: TipoDeProblema;
  descripcion: string;
  estado: EstadoDeProblema;
  respuesta: string | null;
  creado: string;
  actualizado: string | null;
  /** Administración lo cambió después de la última vez que la persona abrió sus reportes. */
  nuevaRespuesta: boolean;
};

/** Los reportes de una persona, del más nuevo al más viejo. */
export async function misReportes(userId: string, limite = 30): Promise<ReporteParaQuienReporta[]> {
  const filas = await getDatabaseClient()
    .select()
    .from(schema.problemReports)
    .where(eq(schema.problemReports.createdByUserId, userId))
    .orderBy(desc(schema.problemReports.createdAt))
    .limit(limite);
  return filas.map((f) => ({
    id: f.id,
    lugar: f.placeLabel,
    tipo: f.kind as TipoDeProblema,
    descripcion: f.description,
    estado: f.status as EstadoDeProblema,
    respuesta: f.resolutionNote,
    creado: f.createdAt.toISOString(),
    actualizado: f.statusChangedAt?.toISOString() ?? null,
    nuevaRespuesta: hayRespuestaNueva(f)
  }));
}

/** La misma regla que `hayRespuestaNueva`, en SQL: para contar sin traer las filas. */
function condicionDeRespuestaNueva(userId: string): SQL | undefined {
  const r = schema.problemReports;
  return and(
    eq(r.createdByUserId, userId),
    isNotNull(r.statusChangedAt),
    isNotNull(r.statusChangedByUserId),
    ne(r.statusChangedByUserId, userId),
    or(sql`${r.reporterSeenAt} IS NULL`, sql`${r.reporterSeenAt} < ${r.statusChangedAt}`)
  );
}

/** Respuestas que la persona no ha visto: el número junto a «Reportar un problema» y el aviso al entrar. */
export async function contarRespuestasNuevas(userId: string): Promise<number> {
  const [f] = await getDatabaseClient()
    .select({ n: sql<string>`count(*)` })
    .from(schema.problemReports)
    .where(condicionDeRespuestaNueva(userId));
  return Number(f?.n ?? 0);
}

/** La persona abrió sus reportes: las respuestas que había quedan vistas. Solo las suyas. */
export async function marcarRespuestasVistas(userId: string): Promise<number> {
  const filas = await getDatabaseClient()
    .update(schema.problemReports)
    .set({ reporterSeenAt: new Date() })
    .where(condicionDeRespuestaNueva(userId))
    .returning({ id: schema.problemReports.id });
  return filas.length;
}

export type ReporteParaRevisar = Omit<ReporteParaQuienReporta, "nuevaRespuesta"> & {
  lugarClave: string;
  foto: string | null;
  ruta: string | null;
  error: string | null;
  dispositivo: DatosDelDispositivo | null;
  quien: { id: string; nombre: string; rol: string | null };
};

export type ResumenDeProblemas = {
  porEstado: Record<EstadoDeProblema, number>;
  /** Lugares con más reportes abiertos (nuevos o en revisión), de más a menos. */
  lugaresConMas: Array<{ lugar: string; abiertos: number }>;
};

/** Para administración: los reportes de su alcance (los más nuevos primero) y su resumen. */
export async function reportesParaRevisar(
  alcance: UserNetworkScope,
  limite = 200
): Promise<{ ok: true; reportes: ReporteParaRevisar[]; resumen: ResumenDeProblemas } | Fallo> {
  const condicion = condicionDeRevision(alcance);
  if (condicion === null) return fallo(403, "prohibido", "Solo administración revisa los reportes de problemas.");
  const db = getDatabaseClient();
  const r = schema.problemReports;

  const [filas, porEstado, porLugar] = await Promise.all([
    db
      .select({ reporte: r, nombre: schema.userProfiles.displayName, rol: schema.roles.name })
      .from(r)
      .innerJoin(schema.userProfiles, eq(schema.userProfiles.id, r.createdByUserId))
      .leftJoin(schema.roles, eq(schema.roles.id, schema.userProfiles.roleId))
      .where(condicion)
      .orderBy(desc(r.createdAt))
      .limit(limite),
    db.select({ estado: r.status, n: sql<string>`count(*)` }).from(r).where(condicion).groupBy(r.status),
    db
      .select({ lugar: r.placeLabel, n: sql<string>`count(*)` })
      .from(r)
      .where(and(condicion, inArray(r.status, ["nuevo", "en_revision"])))
      .groupBy(r.placeLabel)
      .orderBy(desc(sql`count(*)`))
      .limit(5)
  ]);

  const cuenta: Record<EstadoDeProblema, number> = { nuevo: 0, en_revision: 0, resuelto: 0, descartado: 0 };
  for (const f of porEstado) if (esEstadoDeProblema(f.estado)) cuenta[f.estado] = Number(f.n);

  return {
    ok: true,
    reportes: filas.map(({ reporte: f, nombre, rol }) => ({
      id: f.id,
      lugar: f.placeLabel,
      lugarClave: f.place,
      tipo: f.kind as TipoDeProblema,
      descripcion: f.description,
      estado: f.status as EstadoDeProblema,
      respuesta: f.resolutionNote,
      creado: f.createdAt.toISOString(),
      actualizado: f.statusChangedAt?.toISOString() ?? null,
      foto: f.photoUrl,
      ruta: f.pagePath,
      error: f.errorMessage,
      dispositivo: (f.device as DatosDelDispositivo | null) ?? null,
      quien: { id: f.createdByUserId, nombre: nombre, rol: rol ?? null }
    })),
    resumen: { porEstado: cuenta, lugaresConMas: porLugar.map((f) => ({ lugar: f.lugar, abiertos: Number(f.n) })) }
  };
}

/** Los reportes nuevos que esperan a esta administración: el número junto a «Problemas reportados». */
export async function contarProblemasNuevos(alcance: UserNetworkScope): Promise<number> {
  const condicion = condicionDeRevision(alcance);
  if (condicion === null) return 0;
  const [f] = await getDatabaseClient()
    .select({ n: sql<string>`count(*)` })
    .from(schema.problemReports)
    .where(and(condicion, eq(schema.problemReports.status, "nuevo")));
  return Number(f?.n ?? 0);
}

/** Administración cambia el estado de un reporte de su alcance y, si quiere, le contesta a quien lo hizo. */
export async function cambiarEstadoDeReporte(
  actor: ActorContext,
  alcance: UserNetworkScope,
  id: string,
  cuerpo: unknown
): Promise<{ ok: true; estado: EstadoDeProblema; respuesta: string | null } | Fallo> {
  if (!alcance.isAdmin) return fallo(403, "prohibido", "Solo administración revisa los reportes de problemas.");
  const c = (cuerpo && typeof cuerpo === "object" ? cuerpo : {}) as Record<string, unknown>;
  if (!esEstadoDeProblema(c.estado)) return fallo(400, "datos_invalidos", "Elige un estado: nuevo, en revisión, resuelto o cerrado sin cambios.", "estado");
  if (c.respuesta !== undefined && c.respuesta !== null && typeof c.respuesta !== "string") {
    return fallo(400, "datos_invalidos", "La respuesta tiene que ser texto.", "respuesta");
  }
  const respuesta = typeof c.respuesta === "string" ? c.respuesta.trim() : "";
  if (respuesta.length > LARGO_MAXIMO_RESPUESTA) {
    return fallo(400, "datos_invalidos", `La respuesta puede tener hasta ${LARGO_MAXIMO_RESPUESTA} letras.`, "respuesta");
  }

  const db = getDatabaseClient();
  const [fila] = await db.select().from(schema.problemReports).where(eq(schema.problemReports.id, id)).limit(1);
  // Lo de fuera de su alcance no existe para quien pregunta: decir «no es tuyo» ya diría que existe.
  if (!fila || !puedeVerReporte(alcance, fila.createdByUserId)) return fallo(404, "no_encontrado", "Ese reporte no existe.");

  const ahora = new Date();
  await db
    .update(schema.problemReports)
    .set({
      status: c.estado,
      // Sin respuesta nueva se conserva la anterior: cambiar el estado no borra lo que ya se le dijo.
      ...(c.respuesta !== undefined ? { resolutionNote: respuesta || null } : {}),
      statusChangedByUserId: actor.actorId,
      statusChangedAt: ahora,
      updatedAt: ahora
    })
    .where(eq(schema.problemReports.id, id));
  return { ok: true, estado: c.estado, respuesta: c.respuesta !== undefined ? respuesta || null : fila.resolutionNote };
}
