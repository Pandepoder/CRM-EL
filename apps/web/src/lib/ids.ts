/**
 * Identificadores que llegan en la URL.
 *
 * Todas las filas de la base se identifican con UUID. Un segmento `[id]` que no lo es no puede
 * existir, pero llegaba hasta Postgres, que lo rechaza con `invalid input syntax for type uuid`
 * (22P02): nueve rutas respondían 500 —«el servidor se cayó»— a un enlace mal copiado, y el detalle
 * de ciudadano devolvía la consulta SQL entera dentro del 404. Medido con
 * `scripts/local/ids-mal-formados.mjs`: 9 de 23 llamadas con 500, una con SQL en la respuesta.
 *
 * Se comprueba antes de tocar la base y se responde como a cualquier id que no existe.
 */

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuid(valor: unknown): valor is string {
  return typeof valor === "string" && PATRON_UUID.test(valor);
}
