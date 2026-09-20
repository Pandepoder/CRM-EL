import { NextResponse } from "next/server";
import { DevelopmentLogger } from "@tonala/shared/observability";
import { assignResponsible } from "@tonala/modules/assignments/application";

import { createAssignmentsMutationsDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { processOutboxInline } from "@/lib/outbox";
import { exigirAccesoAContacto } from "@/lib/permisos-contacto";
import { permissionChecker, resultToResponse } from "@/lib/api-helpers";
import { Permission, requireActorPermission } from "@/lib/authorization";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Repartir el trabajo es de quien coordina: administración, dirección y los líderes tienen
  // AssignmentsCreate; capturista y brigadista, no. Antes esto era solo de administración, así
  // que un líder no podía poner a un ciudadano a nombre de su propio brigadista y cada
  // asignación tenía que pasar por la oficina.
  const actor = await requireActorPermission(Permission.AssignmentsCreate);
  if (actor instanceof NextResponse) return actor;

  const { id } = await params;

  const vetado = await exigirAccesoAContacto(id, actor.actorId, actor.roles);
  if (vetado) return vetado;
  const body = (await request.json()) as { assignedUserId: string };

  // Y solo hacia su propia gente: con el identificador de alguien de otra dirección se le podía
  // encajar un ciudadano que ni siquiera ve.
  const alcance = await resolveUserNetworkScope(actor.actorId);
  if (!alcance.isGlobal && !(alcance.allowedUserIds ?? []).includes(body.assignedUserId)) {
    return NextResponse.json(
      { error: "Solo puedes asignar ciudadanos a personas de tu estructura." },
      { status: 403 }
    );
  }
  const db = getDatabaseClient();
  const deps = await createAssignmentsMutationsDependencies(db);

  const result = await assignResponsible(actor, {
    contactId: id,
    assignedUserId: body.assignedUserId
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
