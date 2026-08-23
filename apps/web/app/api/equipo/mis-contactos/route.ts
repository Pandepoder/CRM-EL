import { DevelopmentLogger } from "@tonala/shared/observability";
import { listContacts } from "@tonala/modules/contacts/application";
import { createEntityId } from "@tonala/shared/kernel";

import { createCrmDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { actorFromSession, permissionChecker, resultToResponse, unauthorized } from "@/lib/api-helpers";

export async function GET() {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const db = getDatabaseClient();
  const baseDeps = await createCrmDependencies(db);

  const result = await listContacts(
    actor, 
    { assignedUserId: actor.actorId },
    {
      ...baseDeps,
      logger: new DevelopmentLogger(),
      permissionChecker
    }
  );

  return resultToResponse(result);
}

