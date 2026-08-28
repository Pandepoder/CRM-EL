import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { requireActorPermission, Permission } from "@/lib/authorization";
import { schema } from "@tonala/shared/database";
const { eventReports } = schema;
import { eq } from "drizzle-orm";
import { withOutbox } from "@/lib/outbox-helper";

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const actor = await requireActorPermission(Permission.DashboardRead);
  if (actor instanceof NextResponse) return actor;

  const id = params.id;
  
  try {
    const body = await request.json();
    const { status, title, description, category, municipality, district, sectionId, assignedToUserId, eventDate } = body;

    const updatePayload: Record<string, any> = {};

    if (status !== undefined) {
      if (!['active', 'resolved', 'archived'].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updatePayload.status = status;
    }

    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (category !== undefined) updatePayload.category = category;
    if (municipality !== undefined) updatePayload.municipality = municipality;
    if (district !== undefined) updatePayload.district = district;
    if (sectionId !== undefined) updatePayload.sectionId = sectionId || null;
    if (assignedToUserId !== undefined) updatePayload.assignedToUserId = assignedToUserId || null;
    if (eventDate !== undefined) updatePayload.eventDate = eventDate ? new Date(eventDate) : null;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    let updatedReport: any = null;

    await withOutbox("event_report", id, "EventReportUpdated.v1", { id, ...updatePayload }, actor.actorId, async (tx) => {
      const [updated] = await tx
        .update(eventReports)
        .set(updatePayload)
        .where(eq(eventReports.id, id))
        .returning();
      updatedReport = updated;
    });

    if (!updatedReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(updatedReport);
  } catch (error: any) {
    console.error("Failed to update report", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const actor = await requireActorPermission(Permission.DashboardRead);
  if (actor instanceof NextResponse) return actor;

  const id = params.id;

  try {
    let deletedReport: any = null;

    await withOutbox("event_report", id, "EventReportDeleted.v1", { id }, actor.actorId, async (tx) => {
      const [deleted] = await tx
        .delete(eventReports)
        .where(eq(eventReports.id, id))
        .returning();
      deletedReport = deleted;
    });

    if (!deletedReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Report deleted successfully",
      deletedReport
    });
  } catch (error: any) {
    console.error("Failed to delete report", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
