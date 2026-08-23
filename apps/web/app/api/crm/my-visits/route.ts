import { listVisitsForUser } from "@tonala/modules/visits/application";
import { DevelopmentLogger } from "@tonala/shared/observability";

import { getDatabaseClient } from "@/lib/db-client";
import { createCrmDependencies } from "@/lib/crm-deps";
import { actorFromSession, permissionChecker, resultToResponse, unauthorized } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const url = new URL(request.url);
  const onlyToday = url.searchParams.get("today") === "true";

  const db = getDatabaseClient();
  const { visitsReader } = await createCrmDependencies(db);
  const result = await listVisitsForUser(
    actor,
    { userId: actor.actorId, onlyToday },
    {
      visitsReader,
      logger: new DevelopmentLogger(),
      permissionChecker
    }
  );

  return resultToResponse(result);
}
