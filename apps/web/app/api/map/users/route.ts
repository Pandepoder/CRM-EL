import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getDatabaseClient } from "@/lib/db-client";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { schema } from "@tonala/shared/database";
import { and, eq, inArray } from "drizzle-orm";

export async function GET(_request: Request) {
  // Antes solo administración y dirección podían pedir esta lista, y devolvía
  // todos los usuarios activos del sistema. Ahora la pide cualquiera que use el
  // mapa, pero acotada a su alcance: sus compañeros de equipo.
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const db = getDatabaseClient();

  try {
    const alcance = await resolveUserNetworkScope(actor.actorId);
    const enAlcance = alcance.isGlobal ? null : (alcance.allowedUserIds ?? [actor.actorId]);
    const users = await db
      .select({
        id: schema.userProfiles.id,
        displayName: schema.userProfiles.displayName,
        email: schema.userProfiles.email,
        role: schema.roles.name
      })
      .from(schema.userProfiles)
      .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
      .where(
        enAlcance
          ? and(eq(schema.userProfiles.status, "active"), inArray(schema.userProfiles.id, enAlcance))
          : eq(schema.userProfiles.status, "active")
      );

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching map users:", error);
    return NextResponse.json({ users: [] });
  }
}
