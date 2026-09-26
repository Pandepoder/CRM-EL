import { and, eq, inArray, sql } from "drizzle-orm";

import { schema } from "@tonala/shared/database";

import { veCiudadano } from "@/lib/contact-visibility";
import { condicionPorAutor } from "@/lib/alcance-municipal";
import { getDatabaseClient } from "@/lib/db-client";
import { incidentScopeCondition } from "@/lib/incident-visibility";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

/**
 * Archivos subidos (`/api/upload`) y quién puede verlos (`/api/uploads/<nombre>`).
 *
 * Antes cualquier sesión bajaba cualquier foto con solo conocer su nombre (A12): fotos de
 * incidencias, de actividades, de escucha social y de bardas, con domicilios y rostros de vecinos.
 * Ahora un archivo se entrega a quien:
 *
 *   1. lo subió (la vista previa del formulario, antes de que el registro exista);
 *   2. puede ver el registro que lo usa: la incidencia o actividad, el reporte de escucha o la
 *      ficha del ciudadano, con la misma regla de alcance que esas pantallas;
 *   3. cualquier sesión, si es la foto de perfil de alguien: sale en la barra lateral, en la ficha
 *      y en las listas del equipo.
 *
 * Como la regla 2 mira qué registro usa el archivo, al guardar hay que impedir que alguien adjunte
 * a su propio registro una foto que no subió: bastaría con copiar la URL de una foto ajena a su
 * foto de perfil para dejarla a la vista de todos. Eso lo comprueba `motivoSiAdjuntosAjenos`.
 *
 * Los archivos subidos antes de la migración 0021 no tienen dueño registrado: se siguen entregando
 * por la regla 2, y quien los subió los ve si puede ver su registro.
 */

export const PREFIJO_DE_ARCHIVOS = "/api/uploads/";

/** Nombre de archivo en disco: sin rutas, sin `..`, solo caracteres de nombre. */
export function esNombreDeArchivoValido(nombre: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(nombre) && !nombre.includes("..");
}

export function urlDeArchivo(nombre: string): string {
  return PREFIJO_DE_ARCHIVOS + nombre;
}

/** El nombre del archivo de una URL `/api/uploads/<nombre>`; cualquier otra cosa, `null`. */
export function nombreDesdeUrl(url: unknown): string | null {
  if (typeof url !== "string" || !url.startsWith(PREFIJO_DE_ARCHIVOS)) return null;
  const nombre = url.slice(PREFIJO_DE_ARCHIVOS.length);
  return esNombreDeArchivoValido(nombre) ? nombre : null;
}

/**
 * Las URLs de una lista de adjuntos tal como se guarda: objetos `{ url, type, name }` (lo que
 * produce `MediaUploader`) o textos sueltos (lo que guarda Escucha Social).
 */
export function urlsDeAdjuntos(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  const urls: string[] = [];
  for (const elemento of valor) {
    if (typeof elemento === "string") urls.push(elemento);
    else if (elemento && typeof elemento === "object" && typeof (elemento as { url?: unknown }).url === "string") {
      urls.push((elemento as { url: string }).url);
    }
  }
  return urls;
}

/** Condición «esta columna jsonb contiene la URL», en cualquiera de las dos formas de guardarla. */
function contieneUrl(columna: typeof schema.eventReports.mediaUrls | typeof schema.socialListening.photoUrls, url: string) {
  return sql`(${columna} @> ${JSON.stringify([{ url }])}::jsonb OR ${columna} @> ${JSON.stringify([url])}::jsonb)`;
}

/** ¿Puede esta persona ver el archivo? Ver las reglas arriba. Falso también si no existe. */
export async function puedeVerArchivo(nombre: string, userId: string): Promise<boolean> {
  if (!esNombreDeArchivoValido(nombre)) return false;
  const db = getDatabaseClient();
  const url = urlDeArchivo(nombre);

  const [propio] = await db
    .select({ nombre: schema.uploadedFiles.fileName })
    .from(schema.uploadedFiles)
    .where(and(eq(schema.uploadedFiles.fileName, nombre), eq(schema.uploadedFiles.uploadedByUserId, userId)))
    .limit(1);
  if (propio) return true;

  const [perfil] = await db
    .select({ id: schema.userProfiles.id })
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.photoUrl, url))
    .limit(1);
  if (perfil) return true;

  const alcance = await resolveUserNetworkScope(userId);

  const [evento] = await db
    .select({ id: schema.eventReports.id })
    .from(schema.eventReports)
    .where(and(contieneUrl(schema.eventReports.mediaUrls, url), incidentScopeCondition(alcance)))
    .limit(1);
  if (evento) return true;

  // Misma regla que la lista de Escucha Social: el maestro todo; un administrador municipal, lo de
  // su municipio y su gente; los demás, lo que levantó alguien de su alcance.
  const [escucha] = await db
    .select({ id: schema.socialListening.id })
    .from(schema.socialListening)
    .where(and(
      contieneUrl(schema.socialListening.photoUrls, url),
      condicionPorAutor(alcance, schema.socialListening.municipalityId, schema.socialListening.createdByUserId)
    ))
    .limit(1);
  if (escucha) return true;

  const bardas = await db
    .select({ id: schema.contacts.id })
    .from(schema.contacts)
    .where(eq(schema.contacts.bardaPhotoUrl, url))
    .limit(5);
  for (const { id } of bardas) {
    if (await veCiudadano(alcance, id)) return true;
  }

  return false;
}

/**
 * Antes de guardar adjuntos: cada uno tiene que ser un archivo subido a esta aplicación y, si no
 * estaba ya en el registro que se edita, subido por la misma persona que guarda. Devuelve el motivo
 * del rechazo, o `null` si todo está bien.
 */
export async function motivoSiAdjuntosAjenos(
  userId: string,
  urls: readonly string[],
  yaAdjuntas: readonly string[] = [],
  opciones: { soloImagenes?: boolean } = {}
): Promise<string | null> {
  const nuevas = urls.filter((u) => !yaAdjuntas.includes(u));
  if (nuevas.length === 0) return null;

  const nombres: string[] = [];
  for (const url of nuevas) {
    const nombre = nombreDesdeUrl(url);
    if (!nombre) return "Solo se pueden adjuntar fotos o videos subidos desde la aplicación.";
    nombres.push(nombre);
  }

  const propios = await getDatabaseClient()
    .select({ nombre: schema.uploadedFiles.fileName, tipo: schema.uploadedFiles.mediaType })
    .from(schema.uploadedFiles)
    .where(and(inArray(schema.uploadedFiles.fileName, nombres), eq(schema.uploadedFiles.uploadedByUserId, userId)));
  const deQuienGuarda = new Map(propios.map((p) => [p.nombre, p.tipo]));
  if (nombres.some((n) => !deQuienGuarda.has(n))) {
    return "Uno de los archivos adjuntos no lo subiste tú. Vuelve a subir la foto desde este formulario.";
  }
  if (opciones.soloImagenes && nombres.some((n) => deQuienGuarda.get(n) !== "image")) {
    return "Aquí solo se puede adjuntar una foto, no un video.";
  }
  return null;
}
