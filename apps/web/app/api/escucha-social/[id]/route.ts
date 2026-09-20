import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { safeErrorMessage } from "@/lib/safe-error";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // `getServerSession` solo se fía de la cookie; `actorFromSession` vuelve a
    // comprobar en la base que la cuenta siga activa. Alguien dado de baja seguía
    // cerrando reportes con su sesión abierta.
    const actor = await actorFromSession();
    if (!actor) return unauthorized();

    const { id } = await params;
    const body = await req.json();
    // `isFormalGestion` del cuerpo se ignora a propósito: la marca de gestión
    // formal solo se mueve por `approveGestion`, que queda abajo en manos de
    // administración y deja constancia de quién aprobó.
    const { status, resolutionNotes, approveGestion } = body;

    const db = getDatabaseClient();

    // Aprobar gestiones formales ante dependencias: solo administración. El rol
    // sale del actor, que ya lo relee de la base en cada petición.
    const isCoordinacion = actor.roles[0] === "admin";

    // Nadie modifica un registro fuera de su alcance. Antes cualquier sesión podía cambiar el
    // estado o las notas de resolución de cualquier registro con solo conocer su id.
    if (!isCoordinacion) {
      const [registro] = await db
        .select({ createdByUserId: schema.socialListening.createdByUserId })
        .from(schema.socialListening)
        .where(eq(schema.socialListening.id, id))
        .limit(1);
      if (!registro) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
      const alcance = await resolveUserNetworkScope(actor.actorId);
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
      updateData.approvedByUserId = approveGestion ? actor.actorId : null;
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

