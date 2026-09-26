import { schema } from "@tonala/shared/database";
import { and, isNotNull, isNull, or, type SQL } from "drizzle-orm";

/**
 * Dónde puede dibujar el mapa a un ciudadano. Una sola definición para el mapa y el Directorio: el
 * aviso del mapa («N ciudadanos sin ubicación no aparecen») enlaza al filtro del Directorio, y los dos
 * tienen que contar a las mismas personas.
 *
 * - Con GPS: en su punto exacto.
 * - Sin GPS pero con una sección que tiene cartografía: en el centro de la sección, marcado como
 *   aproximado.
 * - Sin ninguna de las dos: el mapa no tiene dónde ponerlo.
 *
 * Las condiciones que miran la sección piden la consulta con
 * `leftJoin(schema.electoralSections, eq(schema.contacts.sectionId, schema.electoralSections.id))`.
 */
const C = schema.contacts;

export const contactoConGps: SQL = and(isNotNull(C.exactLatitude), isNotNull(C.exactLongitude))!;

export const contactoSinGps: SQL = or(isNull(C.exactLatitude), isNull(C.exactLongitude))!;

/** Sin GPS y sin una sección con cartografía (o sin sección). */
export const contactoSinUbicacionEnMapa: SQL = and(contactoSinGps, isNull(schema.electoralSections.geomJson))!;
