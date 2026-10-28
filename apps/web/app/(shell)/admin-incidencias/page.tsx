import { and, asc, eq, inArray } from "drizzle-orm";

import { schema } from "@tonala/shared/database";

import { requirePageAccess } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";
import { consultarIncidencias } from "@/lib/incidencias-consulta";
import { leerFiltrosDeIncidencias } from "@/lib/incidencias-filtros";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { getServerSession } from "@/lib/session-server";

import IncidenciasClient from "./IncidenciasClient";

export const dynamic = "force-dynamic";

/**
 * Incidencias: una sola pantalla para atender, buscar y revisar lo cerrado (plan de auditoría de menús, fase 2,
 * D2). Antes eran tres —Incidencias, «Todos los reportes» e Historial— y ninguna tenía buscador ni decía a
 * quién estaba asignada cada una. Las direcciones viejas redirigen aquí (`?vista=todas`, `?vista=cerradas`).
 *
 * La primera página se arma en el servidor con los filtros de la dirección; lo demás (buscar, cambiar de
 * filtro) lo pide la pantalla a `POST /api/incidencias/consulta`, con el texto del buscador fuera de la
 * dirección.
 */
export default async function AdminIncidenciasPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageAccess("/admin-incidencias");
  const session = await getServerSession();
  const alcance = await resolveUserNetworkScope(session.userId);
  // El buscador no viaja en la dirección; si alguien lo escribió a mano, se ignora.
  const filtros = { ...leerFiltrosDeIncidencias(await searchParams), q: "" };

  const db = getDatabaseClient();
  const [inicial, personas, equipos] = await Promise.all([
    consultarIncidencias(alcance, filtros),
    // A quién se puede asignar: lo mismo que acepta el servidor (`motivoAsignacionFueraDeAlcance`).
    db
      .select({ id: schema.userProfiles.id, nombre: schema.userProfiles.displayName })
      .from(schema.userProfiles)
      .where(and(eq(schema.userProfiles.status, "active"), alcance.isMaster ? undefined : inArray(schema.userProfiles.id, alcance.allowedUserIds?.length ? alcance.allowedUserIds : [alcance.userId])))
      .orderBy(asc(schema.userProfiles.displayName)),
    alcance.isMaster || alcance.teamIds.length > 0
      ? db
          .select({ id: schema.teams.id, nombre: schema.teams.name })
          .from(schema.teams)
          .where(alcance.isMaster ? undefined : inArray(schema.teams.id, alcance.teamIds))
          .orderBy(asc(schema.teams.name))
      : Promise.resolve([] as Array<{ id: string; nombre: string }>)
  ]);

  return (
    <IncidenciasClient
      inicial={inicial}
      filtrosIniciales={filtros}
      personas={personas}
      equipos={equipos}
      puedeAsignar={alcance.isAdmin || alcance.isLeader}
    />
  );
}
