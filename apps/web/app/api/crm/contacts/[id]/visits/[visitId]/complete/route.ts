import { DevelopmentLogger } from "@tonala/shared/observability";
import { completeVisit } from "@tonala/modules/visits/application";

import { createVisitsMutationsDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { processOutboxInline } from "@/lib/outbox";
import { exigirAccesoAContacto } from "@/lib/permisos-contacto";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
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

  // El contacto de la dirección se comprueba arriba, pero la visita se tomaba del
  // identificador sin más: con una ficha propia y el identificador de una visita ajena se
  // cerraba la visita de otra brigada. El caso de uso exige que la visita sea de este
  // ciudadano y que quien la cierra sea el asignado o lo tenga en su alcance.
  const alcance = await resolveUserNetworkScope(actor.actorId);

  const result = await completeVisit(actor, {
    visitId,
    contactId: id,
    // Administración entra por su rol; para el resto, las personas bajo su mando o de su equipo.
    scopedUserIds: alcance.allowedUserIds ?? [],
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
