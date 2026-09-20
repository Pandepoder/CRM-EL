import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { schema } from "@tonala/shared/database";

import { getDatabaseClient } from "@/lib/db-client";
import { requireActorPermission, Permission } from "@/lib/authorization";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

const { userProfiles, roles } = schema;

export async function GET() {
  const actor = await requireActorPermission(Permission.ContactsRead);
  if (actor instanceof NextResponse) return actor;

  // La lista completa de la estructura se traía de la base y se recortaba después en memoria:
  // el directorio entero viajaba en cada consulta y cualquier descuido en ese filtro lo
  // publicaba tal cual. El alcance se aplica ahora en la consulta, como en /api/map/users.
  const alcance = await resolveUserNetworkScope(actor.actorId);
  const db = getDatabaseClient();

  const registros = await db
    .select({
      userId: userProfiles.id,
      email: userProfiles.email,
      displayName: userProfiles.displayName,
      roleId: userProfiles.roleId,
      roleKey: roles.key,
      roleName: roles.name,
      status: userProfiles.status,
      createdAt: userProfiles.createdAt
    })
    .from(userProfiles)
    .innerJoin(roles, eq(roles.id, userProfiles.roleId))
    // Sin alcance (una cuenta dada de baja) la lista queda vacía, no sin filtrar.
    .where(alcance.isGlobal ? undefined : inArray(userProfiles.id, alcance.allowedUserIds ?? []))
    .orderBy(desc(userProfiles.createdAt));

  return NextResponse.json(
    registros.map((registro) => ({ ...registro, createdAt: registro.createdAt.toISOString() }))
  );
}
