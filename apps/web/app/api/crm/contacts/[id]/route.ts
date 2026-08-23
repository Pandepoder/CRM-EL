import { getContactDetail } from "@tonala/modules/contacts/application";
import { DevelopmentLogger } from "@tonala/shared/observability";

import { getDatabaseClient } from "@/lib/db-client";
import { createCrmDependencies } from "@/lib/crm-deps";
import { actorFromSession, permissionChecker, resultToResponse, unauthorized } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id } = await params;
  const db = getDatabaseClient();
  const { contactsReader } = await createCrmDependencies(db);
  const result = await getContactDetail(actor, { contactId: id }, {
    contactsReader,
    logger: new DevelopmentLogger(),
    permissionChecker
  });

  return resultToResponse(result);
}
