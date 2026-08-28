import { getContactDetail } from "@tonala/modules/contacts/application";
import { DevelopmentLogger } from "@tonala/shared/observability";

import { getDatabaseClient } from "@/lib/db-client";
import { createCrmDependencies } from "@/lib/crm-deps";
import { actorFromSession, permissionChecker, resultToResponse, unauthorized } from "@/lib/api-helpers";
import { schema } from "@tonala/shared/database";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await actorFromSession();
  if (!actor || (!actor.roles.includes("admin") && !actor.roles.includes("direction"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const db = getDatabaseClient();
    
    await db.transaction(async (tx) => {
      // 1. Marcar como inactivo
      await tx.update(schema.contacts)
        .set({ status: 'inactive' })
        .where(eq(schema.contacts.id, id));
        
      // 2. Auditoría
      await tx.insert(schema.auditLogs).values({
        actorUserId: actor.actorId,
        action: "contacts.deactivate",
        entityType: "contact",
        entityId: id,
        correlationId: actor.correlationId,
        beforeData: null,
        afterData: { status: "inactive" }
      });
      
      // 3. Cascada a visitas pendientes
      // We can't just delete them or set them to 'cancelled' because of DB constraints 
      // (visits_status_check: 'scheduled', 'completed'). We must "complete" them with a rejection.
      const pendingVisits = await tx.select({ id: schema.visits.id })
        .from(schema.visits)
        .where(sql`${schema.visits.contactId} = ${id} AND ${schema.visits.status} = 'scheduled'`);
        
      if (pendingVisits.length > 0) {
        await tx.update(schema.visits)
          .set({ status: 'completed', completedAt: new Date(), completedByUserId: actor.actorId })
          .where(sql`${schema.visits.contactId} = ${id} AND ${schema.visits.status} = 'scheduled'`);
          
        await tx.insert(schema.visitResults).values(
          pendingVisits.map(v => ({
            visitId: v.id,
            structuredOutcome: 'rejected',
            summary: 'Cancelada automáticamente: Contacto eliminado del sistema.',
            completedByUserId: actor.actorId,
            completedAt: new Date()
          }))
        );
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete contact:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
