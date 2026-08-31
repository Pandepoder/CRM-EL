import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { getServerSession } from "@/lib/session-server";
import { safeErrorMessage } from "@/lib/safe-error";

export async function POST(
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
    const { noteText } = body;

    if (!noteText || !noteText.trim()) {
      return NextResponse.json({ error: "El texto de la nota es requerido." }, { status: 400 });
    }

    const db = getDatabaseClient();

    const [inserted] = await db
      .insert(schema.contactNotes)
      .values({
        contactId: id,
        authorUserId: session.userId,
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

