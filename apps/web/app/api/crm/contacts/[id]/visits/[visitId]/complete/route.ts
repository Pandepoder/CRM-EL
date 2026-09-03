import { DevelopmentLogger } from "@tonala/shared/observability";
import { completeVisit } from "@tonala/modules/visits/application";

import { createVisitsMutationsDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { processOutboxInline } from "@/lib/outbox";
import { exigirAccesoAContacto } from "@/lib/permisos-contacto";
import { actorFromSession, permissionChecker, resultToResponse, unauthorized } from "@/lib/api-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; visitId: string }> }
) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id, visitId } = await params;

  const vetado = await exigirAccesoAContacto(id, actor.actorId, actor.roles);
  if (vetado) return vetado;

  const body = (await request.json()) as { structuredOutcome: string; summary?: string };
  const db = getDatabaseClient();
  const deps = await createVisitsMutationsDependencies(db);

  const result = await completeVisit(actor, {
    visitId,
    structuredOutcome: body.structuredOutcome,
    summary: body.summary ?? ""
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
