import { NextResponse } from "next/server";

import { createCrmDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { requireActorPermission, Permission } from "@/lib/authorization";

export async function GET() {
  const actor = await requireActorPermission(Permission.ContactsRead);
  if (actor instanceof NextResponse) return actor;

  const roleKey = actor.roles[0] ?? "";
  if (!["admin", "territorial_coordinator", "capturist"].includes(roleKey)) {
    return NextResponse.json(
      { code: "forbidden", message: "No tienes permiso para listar usuarios." },
      { status: 403 }
    );
  }

  const db = getDatabaseClient();
  const { usersReader } = await createCrmDependencies(db);
  const users = await usersReader.listUsers();
  return NextResponse.json(users);
}
