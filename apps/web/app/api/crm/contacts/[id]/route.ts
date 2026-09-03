import { getContactDetail } from "@tonala/modules/contacts/application";
import { DevelopmentLogger } from "@tonala/shared/observability";

import { getDatabaseClient } from "@/lib/db-client";
import { createCrmDependencies } from "@/lib/crm-deps";
import { actorFromSession, permissionChecker, unauthorized } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { schema } from "@tonala/shared/database";
import { eq, sql, desc } from "drizzle-orm";
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

  // El alcance de equipo lo calcula la capa web y se le pasa al caso de uso.
  // Sin esto, quien no es administración solo podría abrir sus propias fichas,
  // ni siquiera las de su brigada.
  const alcance = await resolveUserNetworkScope(actor.actorId);

  const result = await getContactDetail(actor, {
    contactId: id,
    ...(alcance.allowedUserIds ? { scopedUserIds: alcance.allowedUserIds } : {})
  }, {
    contactsReader,
    logger: new DevelopmentLogger(),
    permissionChecker
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error.publicMessage || result.error.message }, { status: 404 });
  }

  const baseDetail = result.value;

  // 1. Fetch raw contact row for new August 2026 fields
  const contactRows = await db
    .select({
      id: schema.contacts.id,
      origin: schema.contacts.origin,
      actualContactUserId: schema.contacts.actualContactUserId,
      firstContactDate: schema.contacts.firstContactDate,
      preferredContactMethod: schema.contacts.preferredContactMethod,
      preferredContactTime: schema.contacts.preferredContactTime,
      panMilitancy: schema.contacts.panMilitancy,
      panMilitancyVerifiedAt: schema.contacts.panMilitancyVerifiedAt,
      knowMeBetter: schema.contacts.knowMeBetter,
      bardaPhotoUrl: schema.contacts.bardaPhotoUrl,
      exactLatitude: schema.contacts.exactLatitude,
      exactLongitude: schema.contacts.exactLongitude,
      createdByName: schema.userProfiles.displayName,
      createdByRole: schema.userProfiles.accessType
    })
    .from(schema.contacts)
    .leftJoin(schema.userProfiles, eq(schema.contacts.createdByUserId, schema.userProfiles.id))
    .where(eq(schema.contacts.id, id))
    .limit(1);

  const rawContact = contactRows[0];

  // 2. Fetch notes
  const notes = await db
    .select({
      id: schema.contactNotes.id,
      noteText: schema.contactNotes.noteText,
      createdAt: schema.contactNotes.createdAt,
      authorId: schema.userProfiles.id,
      authorName: schema.userProfiles.displayName,
      authorAccessType: schema.userProfiles.accessType
    })
    .from(schema.contactNotes)
    .leftJoin(schema.userProfiles, eq(schema.contactNotes.authorUserId, schema.userProfiles.id))
    .where(eq(schema.contactNotes.contactId, id))
    .orderBy(desc(schema.contactNotes.createdAt));

  // 3. Fetch survey
  const surveys = await db
    .select()
    .from(schema.socialSurveys)
    .where(eq(schema.socialSurveys.contactId, id))
    .orderBy(desc(schema.socialSurveys.createdAt))
    .limit(1);

  return NextResponse.json({
    ...baseDetail,
    origin: rawContact?.origin || "toca_toca",
    actualContactUserId: rawContact?.actualContactUserId,
    firstContactDate: rawContact?.firstContactDate,
    preferredContactMethod: rawContact?.preferredContactMethod || "whatsapp",
    preferredContactTime: rawContact?.preferredContactTime || "indiferente",
    panMilitancy: rawContact?.panMilitancy || "no_registrada",
    panMilitancyVerifiedAt: rawContact?.panMilitancyVerifiedAt,
    knowMeBetter: rawContact?.knowMeBetter,
    bardaPhotoUrl: rawContact?.bardaPhotoUrl,
    exactLatitude: rawContact?.exactLatitude,
    exactLongitude: rawContact?.exactLongitude,
    creator: {
      name: rawContact?.createdByName || "Sistema",
      accessType: rawContact?.createdByRole || "conexion"
    },
    notes,
    survey: surveys[0] || null
  });
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
      await tx.update(schema.contacts)
        .set({ status: 'inactive' })
        .where(eq(schema.contacts.id, id));
        
      await tx.insert(schema.auditLogs).values({
        actorUserId: actor.actorId,
        action: "contacts.deactivate",
        entityType: "contact",
        entityId: id,
        correlationId: actor.correlationId,
        beforeData: null,
        afterData: { status: "inactive" }
      });
      
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
