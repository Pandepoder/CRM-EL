import { sql, type SQL } from "drizzle-orm";

/**
 * Las tablas que llevan llave de municipio (migración 0022) y cómo contar lo que quedó en General.
 *
 * Una sola lista para la pantalla «Sin municipio», su acción de reasignar y el informe que imprime
 * `pnpm db:migrate` al terminar: si una tabla nueva gana la llave, se añade aquí y las tres la ven.
 */

export const TABLAS_CON_MUNICIPIO = [
  // El administrador maestro está en General a propósito: gobierna todo el estado (0023).
  { clave: "personas", tabla: "user_profiles", etiqueta: "Personas", filtro: "NOT is_master_admin" },
  { clave: "equipos", tabla: "teams", etiqueta: "Equipos" },
  { clave: "ciudadanos", tabla: "contacts", etiqueta: "Ciudadanos" },
  { clave: "incidencias", tabla: "event_reports", etiqueta: "Incidencias y actividades" },
  { clave: "almacenes", tabla: "warehouses", etiqueta: "Almacenes" },
  // Las opciones del sistema y las de organización en General son estatales, de todos, a propósito
  // (0023): solo cuentan las de red de alguien sin municipio.
  { clave: "catalogo", tabla: "activity_catalog_options", etiqueta: "Opciones de catálogo", filtro: "NOT is_system AND scope = 'network'" },
  { clave: "escucha", tabla: "social_listening", etiqueta: "Escucha social" },
  { clave: "prospectos", tabla: "rapid_activity_prospects", etiqueta: "Prospectos" }
] as const;

export type TablaConMunicipio = (typeof TABLAS_CON_MUNICIPIO)[number];
export type ClaveDeTabla = TablaConMunicipio["clave"];

/** Nombre de la fila especial del catálogo de municipios. */
export const NOMBRE_GENERAL = "General (estatal)";

/**
 * Una consulta que devuelve, por tabla, cuántas filas hay y cuántas están en General:
 * `(clave, total, en_general)`. Los nombres de tabla salen de la lista fija de arriba, nunca de
 * una entrada, así que se pueden escribir en el texto de la consulta.
 */
export function consultaDeConteoEnGeneral(): string {
  return TABLAS_CON_MUNICIPIO.map(
    (t) =>
      `SELECT '${t.clave}'::text AS clave, count(*)::int AS total, ` +
      `count(*) FILTER (WHERE municipality_id = (SELECT id FROM municipalities WHERE kind = 'general'))::int AS en_general ` +
      `FROM ${t.tabla}` +
      ("filtro" in t ? ` WHERE ${t.filtro}` : "")
  ).join(" UNION ALL ");
}

/**
 * Las personas de un municipio —las que tienen su llave, en cualquier estado— como subconsulta, para
 * `columna IN (…)`. Es «su gente» para un administrador municipal (etapa 6): lo que registraron sigue
 * siendo de su trabajo aunque ya no estén activas.
 */
export function genteDelMunicipio(municipioId: string): SQL {
  return sql`SELECT gente.id FROM user_profiles gente WHERE gente.municipality_id = ${municipioId}`;
}

/**
 * Los ciudadanos que ve un administrador municipal, como subconsulta de ids: los que tienen la llave
 * de su municipio y los que registró, refirió, atiende o tiene asignados su gente. Sin municipio
 * (lo que la 0022 dejó en General), solo los suyos. Una sola regla para el Directorio y demás
 * pantallas (`contact-visibility.ts`) y para el módulo de contactos: no pueden decir cosas distintas.
 * El alias es propio para no chocar con el de la consulta de fuera.
 */
export function ciudadanosDeAdministracion(municipioId: string | null, userId: string, contactId?: string): SQL {
  const gente = municipioId ? genteDelMunicipio(municipioId) : sql`SELECT ${userId}::uuid`;
  const porLlave = municipioId ? sql`cv.municipality_id = ${municipioId} OR ` : sql``;
  const soloEste = contactId ? sql`cv.id = ${contactId} AND ` : sql``;
  return sql`SELECT cv.id FROM contacts cv WHERE ${soloEste}(${porLlave}cv.created_by_user_id IN (${gente})
    OR cv.referred_by_user_id IN (${gente})
    OR cv.actual_contact_user_id IN (${gente})
    OR cv.id IN (SELECT cva.contact_id FROM contact_assignments cva WHERE cva.assignment_status = 'active' AND cva.assigned_user_id IN (${gente})))`;
}
