import { NextResponse } from "next/server";
import { DevelopmentLogger } from "@tonala/shared/observability";
import { getOperationalSummary } from "@tonala/modules/command-center/application";
import { createResumenDependencies } from "@/lib/resumen-deps";

import { getDatabaseClient } from "@/lib/db-client";
import { permissionChecker, requireActorRoles } from "@/lib/authorization";
import { resultToResponse } from "@/lib/api-helpers";

export async function GET() {
  // Devuelve totales de todo el sistema sin acotar por equipo, así que queda en
  // administración. Dirección y los líderes ven los números de sus equipos en la
  // página /resumen, que hace sus propias consultas ya acotadas.
  const actor = await requireActorRoles("admin");
  if (actor instanceof NextResponse) return actor;

  const db = getDatabaseClient();
  const deps = await createResumenDependencies(db);
  const result = await getOperationalSummary(actor, {
    summaryReader: deps.summaryReader,
    permissionChecker,
    logger: new DevelopmentLogger()
  });

  if (!result.ok) {
    return resultToResponse(result);
  }

  const summary = result.value;
  return NextResponse.json({
    contacts: summary.totalContacts,
    visitsScheduled: summary.visitsScheduled,
    visitsCompleted: summary.visitsCompleted,
    usersActive: summary.totalUsers
  });
}
