import { listContacts } from "@tonala/modules/contacts/application";
import { DevelopmentLogger } from "@tonala/shared/observability";

import { getDatabaseClient } from "@/lib/db-client";
import { createCrmDependencies } from "@/lib/crm-deps";
import { actorFromSession, permissionChecker, resultToResponse, unauthorized } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

export async function GET() {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const db = getDatabaseClient();
  const { contactsReader } = await createCrmDependencies(db);
  const alcance = await resolveUserNetworkScope(actor.actorId);
  const result = await listContacts(actor, {
    ...(alcance.allowedUserIds ? { scopedUserIds: alcance.allowedUserIds } : {})
  }, {
    contactsReader,
    logger: new DevelopmentLogger(),
    permissionChecker
  });

  return resultToResponse(result);
}

import { registerMinimalContact } from "@tonala/modules/contacts/application";
import { createContactsMutationsDependencies } from "@/lib/crm-deps";
import { processOutboxInline } from "@/lib/outbox";

export async function POST(request: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const body = (await request.json()) as { fullName?: string; displayName?: string; phoneNumber?: string };
  const displayName = (body.displayName ?? body.fullName ?? "").trim();
  const db = getDatabaseClient();
  const deps = await createContactsMutationsDependencies(db);
  
  const result = await registerMinimalContact(actor, {
    displayName,
    phoneNumber: body.phoneNumber?.trim() || undefined
  }, {
    ...deps,
    logger: new DevelopmentLogger(),
    permissionChecker
  });

  if (result.ok) {
    // Si la mutación fue exitosa, procesamos el outbox (inline)
    await processOutboxInline(db);
  }

  return resultToResponse(result);
}
