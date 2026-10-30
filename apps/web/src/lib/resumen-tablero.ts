import { and, count, eq, inArray, sql } from "drizzle-orm";

import { schema } from "@tonala/shared/database";

import { accionesPorPersonaYDia } from "@/lib/acciones-por-dia";
import { inicioDeSemana } from "@/lib/actividades";
import { getDatabaseClient } from "@/lib/db-client";
import { diasConMeta, diasDeLaSemana, esMetaValida, medallaDeLaSemana, metaBase, perfilDeTrabajo, type Medalla } from "@/lib/logros";
import { puedeFijarMeta } from "@/lib/meta-del-lider";
import { diaDeJalisco } from "@/lib/mi-progreso";
import type { UserNetworkScope } from "@/lib/network-hierarchy";
import type { RestriccionesDelResumen } from "@/lib/resumen-kpis";

/** La semana de una persona contra su propia meta del día (plan de experiencia sencilla, §4 decisión 2). */
export type SemanaDeLaPersona = {
  /** Acciones de lunes a domingo. */
  porDia: number[];
  /** Qué día de `porDia` es hoy. */
  hoyIndice: number;
  meta: number;
  /** La que le puso quien la coordina; sin ella, `meta` es la de su rol. */
  metaDelLider: number | null;
  diasCumplidos: number;
  medalla: Medalla | null;
};

/** Una tarjeta del tablero «Rendimiento» del Resumen. */
export type IntegranteDelTablero = {
  userId: string;
  displayName: string;
  email: string;
  accessType: string;
  parentEnlaceName: string | null;
  personalSlug: string | null;
  contactsCount: number;
  panContactsCount: number;
  activitiesCount: number;
  completionRate: number;
  isEligibleForPromotion: boolean;
  semana: SemanaDeLaPersona;
  roleKey: string;
  puedeFijarMeta: boolean;
};

/**
 * El tablero «Rendimiento» del Resumen: una tarjeta por cada persona activa del alcance de quien mira —
 * ni una más (nadie de fuera de su mando) ni una menos (nadie de su mando se queda fuera)—, con lo que
 * registró y tiene asignado dentro de lo que quien mira puede ver, y su semana contra su propia meta.
 *
 * - El maestro ve a todas las personas activas; el resto, las de su alcance (`teammateUserIds`): un
 *   administrador municipal, su municipio; quien manda, su cascada. Así un líder no compara su brigada con
 *   la de otro (antes era un tablero de todo el sistema).
 * - Personas y PAN: ciudadanos activos y visibles que dio de alta. Agenda: visitas e incidencias visibles
 *   que tiene asignadas. Las mismas condiciones que los números de cabecera (`restriccionesDelResumen`).
 * - Se cuenta en la base agrupando por persona (agente 8): antes se traían todas las filas a memoria.
 *
 * Fuera de la página para poder probarlo contra una base (`apps/web/tests/experiencia-sencilla.test.ts`).
 */
export async function tableroDelResumen(
  scope: UserNetworkScope,
  restricciones: RestriccionesDelResumen,
  opciones: { ahora?: Date } = {}
): Promise<IntegranteDelTablero[]> {
  const db = getDatabaseClient();
  const scopedUserIds = scope.isMaster ? null : scope.teammateUserIds;
  if (scopedUserIds && scopedUserIds.length === 0) return [];

  // El resto de las pantallas solo lista cuentas activas; aquí faltaba, así que el tablero seguía
  // nombrando a gente dada de baja.
  const personas = await db
    .select({
      userId: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName,
      email: schema.userProfiles.email,
      accessType: schema.userProfiles.accessType,
      parentEnlaceId: schema.userProfiles.parentEnlaceId,
      personalSlug: schema.userProfiles.personalSlug,
      roleKey: schema.roles.key,
      dailyGoal: schema.userProfiles.dailyGoal
    })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(and(eq(schema.userProfiles.status, "active"), scopedUserIds ? inArray(schema.userProfiles.id, scopedUserIds) : undefined));

  const [contactosPorPersona, visitasPorPersona, incidenciasPorPersona] = await Promise.all([
    db
      .select({
        userId: schema.contacts.createdByUserId,
        total: count(),
        pan: sql<string>`count(*) FILTER (WHERE ${schema.contacts.panMilitancy} = 'confirmada')`
      })
      .from(schema.contacts)
      .where(restricciones.contactos)
      .groupBy(schema.contacts.createdByUserId),
    db
      .select({
        userId: schema.visits.assignedUserId,
        total: count(),
        completadas: sql<string>`count(*) FILTER (WHERE ${schema.visits.status} = 'completed')`
      })
      .from(schema.visits)
      .where(restricciones.visitas)
      .groupBy(schema.visits.assignedUserId),
    db
      .select({ userId: schema.eventReports.assignedToUserId, total: count() })
      .from(schema.eventReports)
      .where(restricciones.incidencias)
      .groupBy(schema.eventReports.assignedToUserId)
  ]);
  const porPersona = <T extends { userId: string | null }>(filas: T[]) => new Map(filas.filter((f) => f.userId).map((f) => [f.userId as string, f]));
  const contactosDe = porPersona(contactosPorPersona);
  const visitasDe = porPersona(visitasPorPersona);
  const incidenciasDe = porPersona(incidenciasPorPersona);

  // Medallas de la semana: cada quien contra su propia meta del día —la que le puso quien lo coordina o,
  // si no tiene, la de su rol—, no contra los demás.
  const ahora = opciones.ahora ?? new Date();
  const hoy = diaDeJalisco(ahora);
  const diasSemana = diasDeLaSemana(hoy);
  const accionesDeLaSemana = await accionesPorPersonaYDia(personas.map((u) => u.userId), inicioDeSemana(ahora));

  return personas
    .map((u) => {
      const parent = personas.find((p) => p.userId === u.parentEnlaceId);
      const contactos = contactosDe.get(u.userId);
      const visitas = visitasDe.get(u.userId);
      const contactsCount = Number(contactos?.total ?? 0);
      const panCount = Number(contactos?.pan ?? 0);
      const totalActs = Number(visitas?.total ?? 0) + Number(incidenciasDe.get(u.userId)?.total ?? 0);
      const completedActs = Number(visitas?.completadas ?? 0);
      const rate = totalActs > 0 ? Math.round((completedActs / totalActs) * 100) : 100;

      const metaDelLider = esMetaValida(u.dailyGoal) ? u.dailyGoal : null;
      const meta = metaDelLider ?? metaBase(perfilDeTrabajo(u.roleKey ?? ""));
      const porDiaMapa = accionesDeLaSemana.get(u.userId);
      const porDia = Object.fromEntries(diasSemana.map((dia) => [dia, porDiaMapa?.get(dia) ?? 0]));
      const cumplidos = diasConMeta(porDia, diasSemana, meta);

      return {
        userId: u.userId,
        displayName: u.displayName,
        email: u.email,
        accessType: u.accessType || "conexion",
        parentEnlaceName: parent?.displayName || null,
        personalSlug: u.personalSlug || null,
        contactsCount,
        panContactsCount: panCount,
        activitiesCount: totalActs,
        completionRate: rate,
        isEligibleForPromotion: u.accessType === "conexion" && (contactsCount >= 5 || totalActs >= 3),
        semana: {
          porDia: diasSemana.map((dia) => porDia[dia] ?? 0),
          hoyIndice: diasSemana.indexOf(hoy),
          meta,
          metaDelLider,
          diasCumplidos: cumplidos,
          medalla: medallaDeLaSemana(cumplidos)
        },
        roleKey: u.roleKey ?? "",
        puedeFijarMeta: puedeFijarMeta(scope, u.userId)
      };
    })
    .sort((a, b) => b.contactsCount + b.activitiesCount - (a.contactsCount + a.activitiesCount));
}
