import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { eq } from "drizzle-orm";
import { safeErrorMessage } from "@/lib/safe-error";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id } = await params;
  try {
    const body = await req.json();
    const { status, summary } = body;

    const db = getDatabaseClient();

    let newDescription: string | undefined = undefined;
    if (summary && summary.trim()) {
      const existing = await db
        .select({ description: schema.eventReports.description })
        .from(schema.eventReports)
        .where(eq(schema.eventReports.id, id))
        .limit(1);

      const prevDesc = existing[0]?.description || "";
      newDescription = prevDesc.trim()
        ? `${prevDesc.trim()}\n\nConclusiones / Resultado: ${summary.trim()}`
        : summary.trim();
    }

    const [updated] = await db
      .update(schema.eventReports)
      .set({
        status: status || "resolved",
        ...(newDescription ? { description: newDescription } : {})
      })
      .where(eq(schema.eventReports.id, id))
      .returning();

    return NextResponse.json({ success: true, task: updated });
  } catch (error: unknown) {
    console.error("Error updating task status:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al actualizar tarea") }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id } = await params;
  try {
    const db = getDatabaseClient();
    await db.delete(schema.eventReports).where(eq(schema.eventReports.id, id));
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al eliminar tarea") }, { status: 500 });
  }
}

