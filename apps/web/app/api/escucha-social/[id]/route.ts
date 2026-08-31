import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/session-server";
import { safeErrorMessage } from "@/lib/safe-error";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, resolutionNotes, isFormalGestion, approveGestion } = body;

    const db = getDatabaseClient();

    // Check user role for approval
    const userRow = await db
      .select({
        accessType: schema.userProfiles.accessType,
        roleKey: schema.roles.key
      })
      .from(schema.userProfiles)
      .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
      .where(eq(schema.userProfiles.id, session.userId))
      .limit(1);

    const isCoordinacion = userRow[0] && (userRow[0].accessType === "coordinacion" || userRow[0].roleKey === "admin" || userRow[0].roleKey === "direction");

    const updateData: any = {};
    if (status) updateData.status = status;
    if (resolutionNotes !== undefined) updateData.resolutionNotes = resolutionNotes;
    
    if (approveGestion !== undefined) {
      if (!isCoordinacion) {
        return NextResponse.json({ error: "Solo la Coordinación puede aprobar gestiones formales ante dependencias." }, { status: 403 });
      }
      updateData.isFormalGestion = approveGestion ? 1 : 0;
      updateData.approvedByUserId = approveGestion ? session.userId : null;
    }

    const [updated] = await db
      .update(schema.socialListening)
      .set(updateData)
      .where(eq(schema.socialListening.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      item: updated
    });
  } catch (error: unknown) {
    console.error("Error in PATCH /api/escucha-social/[id]:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al actualizar registro.") }, { status: 500 });
  }
}

