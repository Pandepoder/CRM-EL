import { NextResponse } from "next/server";

import { createCrmDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { requireActorPermission, Permission } from "@/lib/authorization";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

export async function GET() {
  const actor = await requireActorPermission(Permission.ContactsRead);
  if (actor instanceof NextResponse) return actor;

  const db = getDatabaseClient();
  const { usersReader } = await createCrmDependencies(db);
  const allUsers = await usersReader.listUsers();

  const scope = await resolveUserNetworkScope(actor.actorId);

  if (scope.isGlobal) {
    return NextResponse.json(allUsers);
  }

  // Non-global roles only see their own brigade teammates
  const teammateIds = new Set(scope.teammateUserIds || [actor.actorId]);
  const filteredUsers = allUsers.filter(u => teammateIds.has(u.userId));

  return NextResponse.json(filteredUsers);
}
