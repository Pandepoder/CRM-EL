import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { and, eq } from "drizzle-orm";
import { condicionParaTrabajarPorAutor, condicionPorAutor } from "@/lib/alcance-municipal";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { safeErrorMessage } from "@/lib/safe-error";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";
import { esUuid } from "@/lib/ids";

/** Los estados que ofrece la pantalla de Escucha Social. */
const ESTADOS_ESCUCHA: readonly unknown[] = ["pendiente", "en_seguimiento", "cerrado"];

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
    if (!esUuid(id)) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    let body: { status?: unknown; resolutionNotes?: unknown; approveGestion?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
    }
    // `isFormalGestion` del cuerpo se ignora a propósito: la marca de gestión
    // formal solo se mueve por `approveGestion`, que queda abajo en manos de
    // administración y deja constancia de quién aprobó.
    const { status, resolutionNotes, approveGestion } = body;
    // Los tres estados que ofrece la pantalla. Antes se guardaba cualquier texto, y un estado inventado
    // sacaba el registro de todos los filtros.
    if (status !== undefined && !ESTADOS_ESCUCHA.includes(status)) {
      return NextResponse.json({ error: "Ese estado no existe. Elige pendiente, en seguimiento o cerrado." }, { status: 400 });
    }
    if (resolutionNotes !== undefined && resolutionNotes !== null && (typeof resolutionNotes !== "string" || resolutionNotes.length > 4000)) {
      return NextResponse.json({ error: "Las notas de resolución no son válidas (hasta 4000 caracteres)." }, { status: 400 });
    }

    const db = getDatabaseClient();

    // Aprobar gestiones formales ante dependencias: solo administración, que ya se relee de la base
    // en cada petición.
    const alcance = await resolveUserNetworkScope(actor.actorId);
    const isCoordinacion = alcance.isAdmin;

    // Nadie modifica un registro fuera de su alcance. Antes cualquier sesión podía cambiar el
    // estado o las notas de resolución de cualquier registro con solo conocer su id. Tampoco
    // administración fuera del suyo (etapa 6): un administrador municipal, su municipio y su gente.
    const [registro] = await db
      .select({ id: schema.socialListening.id })
      .from(schema.socialListening)
      .where(and(
        eq(schema.socialListening.id, id),
        condicionPorAutor(alcance, schema.socialListening.municipalityId, schema.socialListening.createdByUserId)
      ))
      .limit(1);
    // Lo que no se ve no existe, como en el resto del sistema: decir «no es de tu equipo» confirmaba
    // que el identificador existía.
    if (!registro) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    // Verlo no es trabajarlo (A20): el capturista ve lo de su brigada, pero el estado lo mueve quien
    // lo levantó o quien coordina.
    const [trabajable] = await db
      .select({ id: schema.socialListening.id })
      .from(schema.socialListening)
      .where(and(
        eq(schema.socialListening.id, id),
        condicionParaTrabajarPorAutor(alcance, schema.socialListening.municipalityId, schema.socialListening.createdByUserId)
      ))
      .limit(1);
    if (!trabajable) {
      return NextResponse.json({ error: "Solo consulta: este registro lo atiende quien lo levantó o quien coordina su brigada." }, { status: 403 });
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

    // Sin nada que cambiar, Drizzle lanza «No values to set» y salía un 500.
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No hay nada que actualizar." }, { status: 400 });
    }

    const [updated] = await db
      .update(schema.socialListening)
      .set(updateData)
      .where(eq(schema.socialListening.id, id))
      .returning();
    // Administración no pasa por la comprobación de arriba: un id inexistente respondía «success».
    if (!updated) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });

    return NextResponse.json({
      success: true,
      item: updated
    });
  } catch (error: unknown) {
    registrarError("Error in PATCH /api/escucha-social/[id]", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al actualizar registro.") }, { status: 500 });
  }
}

