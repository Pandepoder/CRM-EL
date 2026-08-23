import { NextResponse } from "next/server";
import { DevelopmentLogger } from "@tonala/shared/observability";
import { getSectionStats } from "@tonala/modules/territory/application";

import { createTerritoryMutationsDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { actorFromSession, permissionChecker, unauthorized } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { searchParams } = new URL(request.url);
  const sectionNumStr = searchParams.get("sectionNum");

  if (!sectionNumStr) {
    return NextResponse.json({ error: "Missing sectionNum" }, { status: 400 });
  }

  const sectionNum = parseInt(sectionNumStr, 10);
  if (isNaN(sectionNum)) {
    return NextResponse.json({ error: "Invalid sectionNum" }, { status: 400 });
  }

  const db = getDatabaseClient();
  const deps = await createTerritoryMutationsDependencies(db);

  const result = await getSectionStats(actor, { sectionNum }, {
    territoryReader: deps.territoryReader,
    logger: new DevelopmentLogger(),
    permissionChecker
  });

  if (!result.ok) {
    if (result.error.code === "permission_denied") {
      return unauthorized();
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json(result.value);
}
