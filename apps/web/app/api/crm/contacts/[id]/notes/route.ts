import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { exigirAccesoAContacto } from "@/lib/permisos-contacto";
import { safeErrorMessage } from "@/lib/safe-error";
import { registrarError } from "@/lib/registro";

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
    let noteText: unknown;
    try {
      ({ noteText } = await req.json());
    } catch {
      return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
    }

    // Un valor que no es texto (un número, un objeto) hacía fallar `.trim()` con un 500.
    if (typeof noteText !== "string" || !noteText.trim()) {
      return NextResponse.json({ error: "El texto de la nota es requerido." }, { status: 400 });
    }
    if (noteText.trim().length > 4000) {
      return NextResponse.json({ error: "La nota puede tener hasta 4000 caracteres." }, { status: 400 });
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
    registrarError("Error adding contact note", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al registrar la nota.") }, { status: 500 });
  }
}

