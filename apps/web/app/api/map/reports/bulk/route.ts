import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { requireActorRoles } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
const { eventReports } = schema;
import { inArray, eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  // Operaciones en bloque —purgar, resolver, reasignar o borrar muchas de golpe—
  // no comprueban propiedad ni equipo una por una, así que quedan reservadas a
  // administración. Dirección coordina sus brigadas desde la ficha de cada
  // incidencia, donde sí se comprueba a quién pertenece.
  const actor = await requireActorRoles("admin");
  if (actor instanceof NextResponse) return actor;

  const db = getDatabaseClient();

  try {
    const body = await request.json();
    const { action, ids, assignedToUserId, municipality } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    // 1. Purge all resolved incidents
    if (action === "purge_resolved") {
      let conditions = eq(eventReports.status, "resolved");
      if (municipality && municipality !== "all") {
        conditions = and(eq(eventReports.status, "resolved"), eq(eventReports.municipality, municipality)) as any;
      }

      const deleted = await db.delete(eventReports).where(conditions).returning();
      
      return NextResponse.json({
        success: true,
        message: `Se han purgado ${deleted.length} incidencias resueltas`,
        count: deleted.length
      });
    }

    // Array of IDs is required for other actions
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
    }

    // 2. Bulk Resolve
    if (action === "resolve") {
      const updated = await db
        .update(eventReports)
        .set({ status: "resolved" })
        .where(inArray(eventReports.id, ids))
        .returning();

      return NextResponse.json({
        success: true,
        message: `${updated.length} incidencias marcadas como resueltas`,
        count: updated.length
      });
    }

    // 3. Bulk Reopen / Activate
    if (action === "reopen") {
      const updated = await db
        .update(eventReports)
        .set({ status: "active" })
        .where(inArray(eventReports.id, ids))
        .returning();

      return NextResponse.json({
        success: true,
        message: `${updated.length} incidencias reabiertas`,
        count: updated.length
      });
    }

    // 4. Bulk Delete
    if (action === "delete") {
      const deleted = await db
        .delete(eventReports)
        .where(inArray(eventReports.id, ids))
        .returning();

      return NextResponse.json({
        success: true,
        message: `${deleted.length} incidencias eliminadas`,
        count: deleted.length
      });
    }

    // 5. Bulk Assign
    if (action === "assign") {
      const updated = await db
        .update(eventReports)
        .set({ assignedToUserId: assignedToUserId || null })
        .where(inArray(eventReports.id, ids))
        .returning();

      return NextResponse.json({
        success: true,
        message: `${updated.length} incidencias asignadas`,
        count: updated.length
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("Bulk incident action failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
