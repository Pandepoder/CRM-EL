import { listVisitsByContact, scheduleVisit } from "@tonala/modules/visits/application";
import { DevelopmentLogger } from "@tonala/shared/observability";

import { getDatabaseClient } from "@/lib/db-client";
import { createCrmDependencies, createVisitsMutationsDependencies } from "@/lib/crm-deps";
import { processOutboxInline } from "@/lib/outbox";
import { actorFromSession, permissionChecker, resultToResponse, unauthorized } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id } = await params;
  const db = getDatabaseClient();
  const { visitsReader } = await createCrmDependencies(db);
  const result = await listVisitsByContact(actor, { contactId: id }, {
    visitsReader,
    logger: new DevelopmentLogger(),
    permissionChecker
  });

  return resultToResponse(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id } = await params;
  const body = (await request.json()) as { scheduledAt: string; visitLocationText?: string };
  const db = getDatabaseClient();
  const deps = await createVisitsMutationsDependencies(db);

  const result = await scheduleVisit(actor, {
    contactId: id,
    scheduledAt: body.scheduledAt,
    visitLocationText: body.visitLocationText?.trim() || "Por confirmar"
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
