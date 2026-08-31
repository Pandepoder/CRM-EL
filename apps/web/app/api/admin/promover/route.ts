import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/session-server";
import { safeErrorMessage } from "@/lib/safe-error";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const db = getDatabaseClient();

    // Verify actor is Coordinación or Admin
    const actorRow = await db
      .select({
        accessType: schema.userProfiles.accessType,
        roleKey: schema.roles.key
      })
      .from(schema.userProfiles)
      .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
      .where(eq(schema.userProfiles.id, session.userId))
      .limit(1);

    const actor = actorRow[0];
    const isCoordinacion = actor && (actor.accessType === "coordinacion" || actor.roleKey === "admin" || actor.roleKey === "direction");

    if (!isCoordinacion) {
      return NextResponse.json({ error: "Solo la Coordinación puede cambiar la categoría de un integrante." }, { status: 403 });
    }

    const body = await req.json();
    const targetUserId = body.targetUserId || body.userId;
    const newAccessType = body.newAccessType || body.toAccessType || "enlace";
    const reason = body.reason || "Constancia y desempeño en el proyecto";

    if (!targetUserId) {
      return NextResponse.json({ error: "ID de usuario objetivo requerido." }, { status: 400 });
    }

    // Get current target user state
    const targetUser = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.id, targetUserId))
      .limit(1);

    if (!targetUser[0]) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    const previousAccessType = targetUser[0].accessType || "conexion";

    // Update user access type
    await db
      .update(schema.userProfiles)
      .set({
        accessType: newAccessType,
        updatedAt: new Date()
      })
      .where(eq(schema.userProfiles.id, targetUserId));

    // Record promotion history
    await db.insert(schema.userPromotionsHistory).values({
      userId: targetUserId,
      fromAccessType: previousAccessType,
      toAccessType: newAccessType,
      reason,
      promotedByUserId: session.userId,
      promotedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: `Integrante actualizado exitosamente a ${newAccessType.toUpperCase()}.`,
      userId: targetUserId,
      newAccessType
    });
  } catch (error: unknown) {
    console.error("Error in promotion endpoint:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al promover usuario") }, { status: 500 });
  }
}

