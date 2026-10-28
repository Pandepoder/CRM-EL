import { eq, sql } from "drizzle-orm";

import { schema } from "@tonala/shared/database";

import { accionesPorPersonaYDia, sumarAcciones } from "@/lib/acciones-por-dia";
import { getDatabaseClient } from "@/lib/db-client";
import { inicioDeDia, inicioDeSemana, ZONA_HORARIA } from "@/lib/actividades";
import {
  esMetaValida,
  insigniasDe,
  lunesDe,
  metaBase,
  MINIMO_PARA_TOTAL_DE_BRIGADA,
  perfilDeTrabajo,
  rachaSemanal,
  type Conteos,
  type EstadoDeInsignia,
  type PerfilDeTrabajo
} from "@/lib/logros";
import type { UserNetworkScope } from "@/lib/network-hierarchy";

/**
 * El progreso de UNA persona, contado solo sobre sus propios registros: lo que ella creó, cerró o
 * convirtió. No lee nada de nadie más, así que no pasa por el alcance de mando; tampoco recibe el id de
 * fuera: la API lo toma de la sesión (`/api/yo/progreso`), y nadie puede pedir el progreso de otra.
 *
 * Los registros que llegan por su QR o enlace (`enlace_personal`, `evento`) quedan a su nombre: cuentan en
 * su día —en un evento, el teléfono que recibe los registros es el suyo— pero no en sus insignias de
 * registro, que piden haber capturado ella misma.
 *
 * La única cifra que no es suya es la de su equipo (`equipo`), y va sin nombres: ver `equipoDe`.
 */

/**
 * Cómo le va al equipo esta semana (§4, decisiones 2 y 3 del plan).
 * - `mando`: para quien coordina, su gente bajo mando —la misma que ya ve en el Resumen—, contra la
 *   semana pasada.
 * - `brigada`: para quien es integrante de un equipo sin mandar en él. Solo el total y lo que aportó
 *   la persona, sin nombres, y solo si el equipo tiene al menos cuatro personas activas: con menos, el
 *   total menos lo propio deja adivinar lo de cada compañero.
 */
export type EquipoDeLaSemana =
  | { tipo: "mando"; semana: number; semanaPasada: number; personas: number; activas: number }
  | { tipo: "brigada"; semana: number; tuyo: number; personas: number };

export type MiProgreso = {
  /** AAAA-MM-DD de Jalisco: la tarjeta lo usa para saber si cambió el día. */
  dia: string;
  perfil: PerfilDeTrabajo;
  /** Meta con ritmo normal; la persona la ajusta en su teléfono. */
  metaBase: number;
  /** La meta que le puso quien la coordina (0026). Si hay, manda sobre su ritmo. */
  metaDelLider: number | null;
  hoy: { total: number; registros: number; porMiEnlace: number; cierres: number; otros: number };
  semana: number;
  racha: number;
  conteos: Conteos;
  insignias: EstadoDeInsignia[];
  equipo: EquipoDeLaSemana | null;
};

const ORIGENES_DEL_ENLACE = sql`('enlace_personal', 'evento')`;

/** Día de Jalisco, AAAA-MM-DD. */
export function diaDeJalisco(instante: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit" }).format(instante);
}

const n = (v: unknown) => Number(v ?? 0) || 0;

export async function progresoDe(alcance: UserNetworkScope, ahora: Date = new Date()): Promise<MiProgreso> {
  const { userId, roleKey: rol } = alcance;
  const db = getDatabaseClient();
  const hoy = inicioDeDia(ahora).toISOString();
  const semana = inicioDeSemana(ahora).toISOString();

  const [ciudadanos, cierres, prospectos, escucha, dias, metaGuardada, equipo] = await Promise.all([
    db.execute<Record<string, unknown>>(sql`
      SELECT
        count(*) FILTER (WHERE coalesce(origin, '') NOT IN ${ORIGENES_DEL_ENLACE}) AS registros,
        count(DISTINCT coalesce(phone_hash, id::text)) FILTER (
          WHERE coalesce(origin, '') NOT IN ${ORIGENES_DEL_ENLACE} AND section_id IS NOT NULL
        ) AS completos,
        count(*) FILTER (WHERE coalesce(origin, '') NOT IN ${ORIGENES_DEL_ENLACE} AND exact_latitude IS NOT NULL) AS con_ubicacion,
        count(*) FILTER (WHERE origin IN ${ORIGENES_DEL_ENLACE}) AS por_enlace,
        count(*) FILTER (WHERE created_at >= ${hoy}::timestamptz AND coalesce(origin, '') NOT IN ${ORIGENES_DEL_ENLACE}) AS hoy_propios,
        count(*) FILTER (WHERE created_at >= ${hoy}::timestamptz AND origin IN ${ORIGENES_DEL_ENLACE}) AS hoy_enlace,
        count(*) FILTER (WHERE created_at >= ${semana}::timestamptz) AS semana
      FROM contacts
      WHERE created_by_user_id = ${userId} AND status = 'active'
    `),
    // Una visita completada desde la Agenda también cierra su actividad (`event_reports.visit_id`): se
    // cuenta una sola vez.
    db.execute<Record<string, unknown>>(sql`
      SELECT
        count(*) AS cierres,
        count(*) FILTER (WHERE resultado IN ('successful', 'positive_commitment')) AS buenos,
        count(*) FILTER (WHERE cuando >= ${hoy}::timestamptz) AS hoy,
        count(*) FILTER (WHERE cuando >= ${semana}::timestamptz) AS semana
      FROM (
        SELECT e.closed_at AS cuando, e.outcome AS resultado
          FROM event_reports e
         WHERE e.closed_by_user_id = ${userId} AND e.status = 'resolved'
        UNION ALL
        SELECT v.completed_at, r.structured_outcome
          FROM visits v
          LEFT JOIN visit_results r ON r.visit_id = v.id
         WHERE v.completed_by_user_id = ${userId} AND v.status = 'completed'
           AND NOT EXISTS (
             SELECT 1 FROM event_reports e2
              WHERE e2.visit_id = v.id AND e2.closed_by_user_id = ${userId} AND e2.status = 'resolved'
           )
      ) x
    `),
    db.execute<Record<string, unknown>>(sql`
      SELECT
        count(*) FILTER (WHERE created_by_user_id = ${userId} AND created_at >= ${hoy}::timestamptz) AS hoy,
        count(*) FILTER (WHERE created_by_user_id = ${userId} AND created_at >= ${semana}::timestamptz) AS semana,
        count(*) FILTER (WHERE converted_by_user_id = ${userId} AND converted_to_contact_id IS NOT NULL) AS convertidos
      FROM rapid_activity_prospects
      WHERE created_by_user_id = ${userId} OR converted_by_user_id = ${userId}
    `),
    db.execute<Record<string, unknown>>(sql`
      SELECT
        count(*) AS total,
        count(*) FILTER (WHERE created_at >= ${hoy}::timestamptz) AS hoy,
        count(*) FILTER (WHERE created_at >= ${semana}::timestamptz) AS semana
      FROM social_listening
      WHERE created_by_user_id = ${userId}
    `),
    db.execute<{ dia: string }>(sql`
      SELECT DISTINCT to_char((t AT TIME ZONE ${ZONA_HORARIA})::date, 'YYYY-MM-DD') AS dia
      FROM (
        SELECT created_at AS t FROM contacts WHERE created_by_user_id = ${userId} AND status = 'active'
        UNION ALL SELECT closed_at FROM event_reports WHERE closed_by_user_id = ${userId} AND status = 'resolved' AND closed_at IS NOT NULL
        UNION ALL SELECT completed_at FROM visits WHERE completed_by_user_id = ${userId} AND status = 'completed'
        UNION ALL SELECT created_at FROM rapid_activity_prospects WHERE created_by_user_id = ${userId}
        UNION ALL SELECT created_at FROM social_listening WHERE created_by_user_id = ${userId}
      ) x
      ORDER BY 1 DESC
    `),
    db.select({ meta: schema.userProfiles.dailyGoal }).from(schema.userProfiles).where(eq(schema.userProfiles.id, userId)).limit(1),
    equipoDe(alcance, ahora)
  ]);

  const c = ciudadanos.rows[0] ?? {};
  const k = cierres.rows[0] ?? {};
  const p = prospectos.rows[0] ?? {};
  const e = escucha.rows[0] ?? {};
  const diasActivos = dias.rows.map((r) => r.dia);

  const conteos: Conteos = {
    registros: n(c.registros),
    registrosCompletos: n(c.completos),
    conUbicacion: n(c.con_ubicacion),
    porMiEnlace: n(c.por_enlace),
    cierres: n(k.cierres),
    cierresBuenos: n(k.buenos),
    convertidos: n(p.convertidos),
    escucha: n(e.total),
    diasActivos: diasActivos.length
  };

  const perfil = perfilDeTrabajo(rol);
  const dia = diaDeJalisco(ahora);
  const racha = rachaSemanal(diasActivos, dia);
  const registrosHoy = n(c.hoy_propios);
  const enlaceHoy = n(c.hoy_enlace);
  const cierresHoy = n(k.hoy);
  const otrosHoy = n(p.hoy) + n(e.hoy);

  return {
    dia,
    perfil,
    metaBase: metaBase(perfil),
    metaDelLider: esMetaValida(metaGuardada[0]?.meta) ? (metaGuardada[0]?.meta ?? null) : null,
    hoy: { total: registrosHoy + enlaceHoy + cierresHoy + otrosHoy, registros: registrosHoy, porMiEnlace: enlaceHoy, cierres: cierresHoy, otros: otrosHoy },
    semana: n(c.semana) + n(k.semana) + n(p.semana) + n(e.semana),
    racha,
    conteos,
    insignias: insigniasDe(perfil, conteos, racha),
    equipo
  };
}

/**
 * Las personas del equipo donde alguien es integrante sin mandar: los líderes y los integrantes de esos
 * equipos, activos y sin administración. Lo propio incluido.
 */
async function companerosDeBrigada(userId: string): Promise<string[]> {
  const { rows } = await getDatabaseClient().execute<{ id: string }>(sql`
    WITH mis_equipos AS (SELECT team_id FROM team_members WHERE user_id = ${userId})
    SELECT DISTINCT u.id::text AS id
      FROM user_profiles u
      JOIN roles r ON r.id = u.role_id
     WHERE u.status = 'active' AND r.key <> 'admin'
       AND (
         u.id IN (SELECT tm.user_id FROM team_members tm WHERE tm.team_id IN (SELECT team_id FROM mis_equipos))
         OR u.id IN (SELECT t.leader_id FROM teams t WHERE t.id IN (SELECT team_id FROM mis_equipos))
       )
  `);
  return rows.map((r) => r.id);
}

/**
 * Ver `EquipoDeLaSemana`. Administración no lo lleva: su «gente» es el municipio entero y ya tiene el
 * Resumen. Quien coordina recibe el pulso de su mando; quien solo es integrante, el total de su brigada.
 */
export async function equipoDe(alcance: UserNetworkScope, ahora: Date = new Date()): Promise<EquipoDeLaSemana | null> {
  if (alcance.isAdmin) return null;
  const lunes = diaDeJalisco(inicioDeSemana(ahora));
  const mando = (alcance.commandUserIds ?? []).filter((id) => id !== alcance.userId);

  if (mando.length > 0) {
    const lunesPasado = inicioDeSemana(inicioDeDia(ahora, -7));
    const acciones = await accionesPorPersonaYDia(mando, lunesPasado);
    const deEstaSemana = (dia: string) => lunesDe(dia) === lunes;
    return {
      tipo: "mando",
      semana: sumarAcciones(acciones, mando, deEstaSemana),
      semanaPasada: sumarAcciones(acciones, mando, (dia) => !deEstaSemana(dia)),
      personas: mando.length,
      activas: mando.filter((id) => sumarAcciones(acciones, [id], deEstaSemana) > 0).length
    };
  }

  const brigada = await companerosDeBrigada(alcance.userId);
  if (brigada.length < MINIMO_PARA_TOTAL_DE_BRIGADA || !brigada.includes(alcance.userId)) return null;
  const acciones = await accionesPorPersonaYDia(brigada, inicioDeSemana(ahora));
  return {
    tipo: "brigada",
    semana: sumarAcciones(acciones, brigada, () => true),
    tuyo: sumarAcciones(acciones, [alcance.userId], () => true),
    personas: brigada.length
  };
}
