import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
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
    const { status } = body;

    if (!status || !['active', 'resolved', 'archived'].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    let updatedReport: any = null;

    await withOutbox("event_report", id, "EventReportStatusChanged.v1", { id, status }, actor.actorId, async (tx) => {
      const [updated] = await tx
        .update(eventReports)
        .set({ status })
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
