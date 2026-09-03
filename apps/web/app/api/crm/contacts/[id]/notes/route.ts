import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { exigirAccesoAContacto } from "@/lib/permisos-contacto";
import { safeErrorMessage } from "@/lib/safe-error";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // `getServerSession` solo se fía de la cookie; `actorFromSession` vuelve a
    // comprobar en la base que la cuenta siga activa y con qué rol. Alguien dado
    // de baja podía seguir escribiendo notas con su sesión abierta.
    const actor = await actorFromSession();
    if (!actor) return unauthorized();

    const { id } = await params;

    const vetado = await exigirAccesoAContacto(id, actor.actorId, actor.roles);
    if (vetado) return vetado;
    const body = await req.json();
    const { noteText } = body;

    if (!noteText || !noteText.trim()) {
      return NextResponse.json({ error: "El texto de la nota es requerido." }, { status: 400 });
    }

    const db = getDatabaseClient();

    const [inserted] = await db
      .insert(schema.contactNotes)
      .values({
        contactId: id,
        authorUserId: actor.actorId,
        noteText: noteText.trim(),
        createdAt: new Date()
      })
      .returning();

    return NextResponse.json({
      success: true,
      note: inserted
    });
  } catch (error: unknown) {
    console.error("Error adding contact note:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al registrar la nota.") }, { status: 500 });
  }
}

