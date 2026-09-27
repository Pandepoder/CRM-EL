import { eq } from "drizzle-orm";

import { schema } from "@tonala/shared/database";

import { esCategoriaValida } from "@/lib/categorias-incidencia";
import { getDatabaseClient } from "@/lib/db-client";
import { esUuid } from "@/lib/ids";
import { resolverMunicipio } from "@/lib/municipios-jalisco";

/**
 * Los campos de una incidencia que alguien escribe: los mismos criterios al levantarla
 * (`POST /api/map/reports`) y al editarla (`PATCH /api/map/reports/[id]`).
 *
 * Editar no validaba nada: se guardaba cualquier categoría (y la incidencia salía del mapa con un
 * ícono genérico), un título vacío, una fecha imposible (500) o un municipio escrito a mano. Y como
 * la llave de municipio de una incidencia sale de su texto antes que de su sección (0022), escribir
 * «Zapopan» sobre una incidencia de una sección de Tonalá la mudaba de municipio: la veía la
 * administración de Zapopan y su sección decía otra cosa.
 */

export type ProblemaDeCampo = { ok: false; error: string; campo: string };

const problema = (error: string, campo: string): ProblemaDeCampo => ({ ok: false, error, campo });

export type SeccionElegida = { id: string; num: number; municipio: string | null };

/**
 * Una sección por su identificador, de la base y no del caché de polígonos del mapa: ese caché deja
 * fuera las secciones sin geometría, y una sección que existe no debe darse por inexistente.
 */
export async function seccionPorId(id: unknown): Promise<SeccionElegida | null> {
  if (typeof id !== "string" || !esUuid(id)) return null;
  const S = schema.electoralSections;
  const [s] = await getDatabaseClient()
    .select({ id: S.id, num: S.sectionNum, municipio: S.municipality })
    .from(S)
    .where(eq(S.id, id))
    .limit(1);
  return s ?? null;
}

/** Título, descripción, categoría y fecha, si llegan. Devuelve los valores listos para guardar. */
export function camposDeTextoDeIncidencia(
  e: { title?: unknown; description?: unknown; category?: unknown; eventDate?: unknown },
  obligatorios: boolean
):
  | { ok: true; valores: { title?: string; description?: string; category?: string; eventDate?: Date | null } }
  | ProblemaDeCampo {
  const valores: { title?: string; description?: string; category?: string; eventDate?: Date | null } = {};
  for (const [campo, maximo, nombre] of [["title", 200, "El título"], ["description", 4000, "La descripción"]] as const) {
    const v = e[campo];
    if (v === undefined && !obligatorios) continue;
    if (typeof v !== "string" || !v.trim()) return problema(`${nombre} es obligatorio.`, campo);
    if (v.trim().length > maximo) return problema(`${nombre} puede tener hasta ${maximo} caracteres.`, campo);
    valores[campo] = v.trim();
  }
  if (e.category !== undefined || obligatorios) {
    if (!esCategoriaValida(e.category)) return problema(`La categoría "${typeof e.category === "string" ? e.category : ""}" no existe. Elige una de la lista.`, "category");
    valores.category = e.category;
  }
  if (e.eventDate !== undefined) {
    if (e.eventDate === null || e.eventDate === "") {
      valores.eventDate = null;
    } else {
      const fecha = typeof e.eventDate === "string" || typeof e.eventDate === "number" ? new Date(e.eventDate) : new Date(NaN);
      if (Number.isNaN(fecha.getTime())) return problema("La fecha del suceso no es válida.", "eventDate");
      valores.eventDate = fecha;
    }
  }
  return { ok: true, valores };
}

/**
 * Sección y municipio coherentes entre sí. La sección manda: si solo cambia la sección, el municipio
 * pasa a ser el suyo; si llegan los dos y no coinciden, o el municipio no corresponde a la sección que
 * ya tiene, se rechaza diciendo cuál es el bueno.
 *
 * @param actual lo que la incidencia ya tiene (al editar); `null` al levantarla.
 * @returns solo las claves que hay que escribir.
 */
export async function territorioDeIncidencia(
  e: { municipality?: unknown; sectionId?: unknown },
  actual: { municipality: string | null; sectionId: string | null } | null
): Promise<{ ok: true; valores: { municipality?: string | null; sectionId?: string | null } } | ProblemaDeCampo> {
  const valores: { municipality?: string | null; sectionId?: string | null } = {};

  let seccion: SeccionElegida | null = null;
  if (e.sectionId !== undefined) {
    if (e.sectionId === null || e.sectionId === "") {
      valores.sectionId = null;
    } else {
      seccion = await seccionPorId(e.sectionId);
      if (!seccion) return problema("La sección elegida no existe.", "sectionId");
      valores.sectionId = seccion.id;
    }
  } else if (actual?.sectionId && e.municipality !== undefined) {
    seccion = await seccionPorId(actual.sectionId);
  }

  if (e.municipality !== undefined) {
    if (e.municipality === null || e.municipality === "") {
      valores.municipality = seccion?.municipio ?? null;
    } else {
      const nombre = typeof e.municipality === "string" ? resolverMunicipio(e.municipality) : null;
      if (!nombre) return problema(`«${typeof e.municipality === "string" ? e.municipality : ""}» no es un municipio de Jalisco. Elige uno de la lista.`, "municipality");
      if (seccion?.municipio && seccion.municipio !== nombre) {
        return problema(`La sección ${seccion.num} es de ${seccion.municipio}, no de ${nombre}. Corrige el municipio o la sección.`, "municipality");
      }
      valores.municipality = nombre;
    }
  } else if (e.sectionId !== undefined && seccion?.municipio) {
    // Cambió la sección y no se dijo el municipio: el de la sección.
    valores.municipality = seccion.municipio;
  }
  return { ok: true, valores };
}
