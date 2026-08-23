import { NextResponse } from "next/server";

import { createCrmDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { requireActorPermission, Permission } from "@/lib/authorization";

export async function GET() {
  const actor = await requireActorPermission(Permission.ContactsRead);
  if (actor instanceof NextResponse) return actor;

  const db = getDatabaseClient();
  const { territoryCatalogReader } = await createCrmDependencies(db);
  const colonies = await territoryCatalogReader.listActiveColonies();
  
  return NextResponse.json(colonies);
}
