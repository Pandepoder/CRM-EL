import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { schema } from "@tonala/shared/database";

import { actorFromSession } from "@/lib/api-helpers";
import { cuentaGobernada } from "@/lib/alcance-municipal";
import { getDatabaseClient } from "@/lib/db-client";
import { esUuid } from "@/lib/ids";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";
import { safeErrorMessage } from "@/lib/safe-error";

const CATEGORIAS = new Set(["coordinacion", "enlace", "conexion"]);

/**
 * Cambiar la categoría (`accessType`) de un integrante.
 *
 * `actorFromSession` relee rol y estado en la base: antes un administrador dado de baja seguía
 * promoviendo gente con la sesión que ya tenía abierta (A7). Y desde la etapa 6, solo sobre cuentas
 * que gobierna (`gobierno-de-cuentas.ts`): un administrador municipal, su gente, sin tocar a otro
 * administrador. Queda en el historial de promociones y en `audit_logs` (A5).
 */
export async function POST(req: NextRequest) {
  try {
    const actor = await actorFromSession();
    if (!actor) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const alcance = await resolveUserNetworkScope(actor.actorId);
    if (!alcance.isAdmin) {
      return NextResponse.json({ error: "Solo administración puede cambiar la categoría de un integrante." }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const targetUserId = body?.targetUserId ?? body?.userId;
    const newAccessType = body?.newAccessType ?? body?.toAccessType ?? "enlace";
    const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 500) : "Constancia y desempeño en el proyecto";

    if (!esUuid(targetUserId)) {
      return NextResponse.json({ error: "ID de usuario objetivo requerido." }, { status: 400 });
    }
    if (typeof newAccessType !== "string" || !CATEGORIAS.has(newAccessType)) {
      return NextResponse.json({ error: "La categoría debe ser coordinación, enlace o conexión." }, { status: 400 });
    }

    const cuenta = await cuentaGobernada(alcance, targetUserId);
    if (!cuenta) {
      return NextResponse.json({ error: "Esa cuenta no está a tu cargo." }, { status: 404 });
    }

    const db = getDatabaseClient();
    const [actual] = await db
      .select({ accessType: schema.userProfiles.accessType })
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.id, targetUserId))
      .limit(1);
    const previousAccessType = actual?.accessType || "conexion";

    await db.transaction(async (tx) => {
      await tx
        .update(schema.userProfiles)
        .set({ accessType: newAccessType, updatedAt: new Date() })
        .where(eq(schema.userProfiles.id, targetUserId));
      await tx.insert(schema.userPromotionsHistory).values({
        userId: targetUserId,
        fromAccessType: previousAccessType,
        toAccessType: newAccessType,
        reason,
        promotedByUserId: actor.actorId,
        promotedAt: new Date()
      });
      await tx.insert(schema.auditLogs).values({
        actorUserId: actor.actorId,
        action: "user.access_type_change",
        entityType: "user_profile",
        entityId: targetUserId,
        correlationId: actor.correlationId,
        beforeData: { categoria: previousAccessType },
        afterData: { categoria: newAccessType, motivo: reason }
      });
    });

    return NextResponse.json({
      success: true,
      message: `Integrante actualizado exitosamente a ${newAccessType.toUpperCase()}.`,
      userId: targetUserId,
      newAccessType
    });
  } catch (error: unknown) {
    registrarError("Error in promotion endpoint", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al promover usuario") }, { status: 500 });
  }
}
