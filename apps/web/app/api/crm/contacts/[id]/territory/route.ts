import { DevelopmentLogger } from "@tonala/shared/observability";
import { linkContactToColony } from "@tonala/modules/territory/application";

import { createTerritoryMutationsDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { processOutboxInline } from "@/lib/outbox";
import { actorFromSession, permissionChecker, resultToResponse, unauthorized } from "@/lib/api-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id } = await params;
  const body = (await request.json()) as { colonyId: string };
  const db = getDatabaseClient();
  const deps = await createTerritoryMutationsDependencies(db);

  const result = await linkContactToColony(actor, {
    contactId: id,
    colonyId: body.colonyId
  }, {
    ...deps,
    logger: new DevelopmentLogger(),
    permissionChecker
  });

  if (result.ok) {
    await processOutboxInline(db);
  }

  return resultToResponse(result);
}
