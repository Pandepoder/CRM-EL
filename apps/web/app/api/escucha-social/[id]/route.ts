import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/session-server";
import { safeErrorMessage } from "@/lib/safe-error";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

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

    // Aprobar gestiones formales ante dependencias: solo administración.
    const isCoordinacion = userRow[0]?.roleKey === "admin";

    // Nadie modifica un registro fuera de su alcance. Antes cualquier sesión podía cambiar el
    // estado o las notas de resolución de cualquier registro con solo conocer su id.
    if (!isCoordinacion) {
      const [registro] = await db
        .select({ createdByUserId: schema.socialListening.createdByUserId })
        .from(schema.socialListening)
        .where(eq(schema.socialListening.id, id))
        .limit(1);
      if (!registro) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
      const alcance = await resolveUserNetworkScope(session.userId);
      if (!(alcance.allowedUserIds ?? []).includes(registro.createdByUserId)) {
        return NextResponse.json({ error: "Este registro no pertenece a tu equipo" }, { status: 403 });
      }
    }

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

