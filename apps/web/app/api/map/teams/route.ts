import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getDatabaseClient } from "@/lib/db-client";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { schema } from "@tonala/shared/database";
import { eq, inArray, sql } from "drizzle-orm";

/**
 * GET /api/map/teams
 * Equipos a los que se puede asignar una incidencia, con su líder y cuántos
 * integrantes tienen. El conteo importa en la interfaz: asignar a un equipo
 * vacío deja la incidencia sin nadie que la atienda, y quien asigna debería
 * verlo antes de hacerlo.
 */
export async function GET(_request: Request) {
  // Solo los equipos del propio alcance: una incidencia se asigna al equipo de
  // uno, no a cualquiera de la estructura. Administración sigue viéndolos todos.
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const db = getDatabaseClient();

  try {
    const alcance = await resolveUserNetworkScope(actor.actorId);
    if (!alcance.isGlobal && alcance.teamIds.length === 0) {
      return NextResponse.json({ teams: [] });
    }
    const teams = await db
      .select({
        id: schema.teams.id,
        name: schema.teams.name,
        zone: schema.teams.zone,
        municipality: schema.teams.municipality,
        leaderId: schema.teams.leaderId,
        leaderName: schema.userProfiles.displayName,
        memberCount: sql<number>`(
          SELECT count(*)::int FROM team_members m WHERE m.team_id = ${schema.teams.id}
        )`
      })
      .from(schema.teams)
      .leftJoin(schema.userProfiles, eq(schema.teams.leaderId, schema.userProfiles.id))
      .where(alcance.isGlobal ? undefined : inArray(schema.teams.id, alcance.teamIds))
      .orderBy(schema.teams.name);

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Error fetching teams for assignment:", error);
    return NextResponse.json({ teams: [] }, { status: 500 });
  }
}
