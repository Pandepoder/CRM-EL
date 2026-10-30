import { sql } from "drizzle-orm";

import { ZONA_HORARIA } from "@/lib/actividades";
import { getDatabaseClient } from "@/lib/db-client";

/** Persona → día de Jalisco (AAAA-MM-DD) → acciones. */
export type AccionesPorDia = Map<string, Map<string, number>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Cuántas acciones hizo cada persona cada día desde un instante. Cuenta lo mismo que «Mi día»
 * (`mi-progreso.ts`): ciudadanos activos que dio de alta —también los que llegaron por su QR—, visitas
 * y actividades que cerró (la visita que cerró su actividad cuenta una vez), prospectos y peticiones de
 * Escucha Social.
 *
 * Aquí solo se cuenta: quien llama decide de quién pregunta, con el alcance de quien mira. Una sola
 * consulta agrupada para todas las personas, en vez de traer las filas a memoria (agente 8 del plan).
 */
export async function accionesPorPersonaYDia(personas: readonly string[], desde: Date): Promise<AccionesPorDia> {
  const resultado: AccionesPorDia = new Map();
  const ids = [...new Set(personas)].filter((id) => UUID.test(id));
  if (ids.length === 0) return resultado;

  // Un solo parámetro con la lista, y no uno por persona: el Resumen del maestro pregunta por todas.
  const lista = `{${ids.join(",")}}`;
  const d = desde.toISOString();
  const { rows } = await getDatabaseClient().execute<{ persona: string; dia: string; n: number | string }>(sql`
    SELECT persona::text AS persona,
           to_char((t AT TIME ZONE ${ZONA_HORARIA})::date, 'YYYY-MM-DD') AS dia,
           count(*) AS n
      FROM (
        SELECT created_by_user_id AS persona, created_at AS t
          FROM contacts
         WHERE created_by_user_id = ANY(${lista}::uuid[]) AND status = 'active' AND created_at >= ${d}::timestamptz
        UNION ALL
        SELECT closed_by_user_id, closed_at
          FROM event_reports
         WHERE closed_by_user_id = ANY(${lista}::uuid[]) AND status = 'resolved' AND closed_at >= ${d}::timestamptz
        UNION ALL
        SELECT v.completed_by_user_id, v.completed_at
          FROM visits v
         WHERE v.completed_by_user_id = ANY(${lista}::uuid[]) AND v.status = 'completed' AND v.completed_at >= ${d}::timestamptz
           AND NOT EXISTS (
             SELECT 1 FROM event_reports e2
              WHERE e2.visit_id = v.id AND e2.closed_by_user_id = v.completed_by_user_id AND e2.status = 'resolved'
           )
        UNION ALL
        SELECT created_by_user_id, created_at
          FROM rapid_activity_prospects
         WHERE created_by_user_id = ANY(${lista}::uuid[]) AND created_at >= ${d}::timestamptz
        UNION ALL
        SELECT created_by_user_id, created_at
          FROM social_listening
         WHERE created_by_user_id = ANY(${lista}::uuid[]) AND created_at >= ${d}::timestamptz
      ) x
     GROUP BY 1, 2
  `);

  for (const fila of rows) {
    const porDia = resultado.get(fila.persona) ?? new Map<string, number>();
    porDia.set(fila.dia, Number(fila.n) || 0);
    resultado.set(fila.persona, porDia);
  }
  return resultado;
}

/** Suma las acciones de unas personas en los días que cumplen `filtro`. */
export function sumarAcciones(acciones: AccionesPorDia, personas: readonly string[], filtro: (dia: string) => boolean): number {
  let total = 0;
  for (const persona of new Set(personas)) {
    for (const [dia, n] of acciones.get(persona) ?? []) if (filtro(dia)) total += n;
  }
  return total;
}
