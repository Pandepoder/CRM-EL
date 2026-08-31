import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/session-server";
import crypto from "crypto";
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
    const db = getDatabaseClient();

    const prospectRows = await db
      .select()
      .from(schema.rapidActivityProspects)
      .where(eq(schema.rapidActivityProspects.id, id))
      .limit(1);

    const prospect = prospectRows[0];
    if (!prospect) {
      return NextResponse.json({ error: "Prospecto no encontrado." }, { status: 404 });
    }

    if (prospect.convertedToContactId) {
      return NextResponse.json({
        message: "Este prospecto ya fue convertido a Registro Social.",
        contactId: prospect.convertedToContactId
      });
    }

    const contactId = crypto.randomUUID();

    // Create Contact
    await db.insert(schema.contacts).values({
      id: contactId,
      displayName: prospect.prospectName,
      status: "active",
      createdByUserId: session.userId,
      referredByUserId: session.userId,
      actualContactUserId: session.userId,
      firstName: prospect.prospectName.split(" ")[0] || prospect.prospectName,
      lastName: prospect.prospectName.split(" ").slice(1).join(" ") || "",
      profession: prospect.organizationOrReference || "Prospecto",
      interests: `Perfil ${prospect.profileType}`,
      origin: "toca_toca",
      firstContactDate: prospect.activityDate || new Date(),
      colony: prospect.locationText || "Por identificar",
      municipality: "Tonalá",
      knowMeBetter: prospect.dispositionNotes || null,
      createdAt: new Date(),
      version: 1
    });

    // Insert Note with past commitments
    if (prospect.commitments || prospect.privateNotes) {
      await db.insert(schema.contactNotes).values({
        contactId,
        authorUserId: session.userId,
        noteText: `Convertido desde Registro Rápido. Acuerdos: ${prospect.commitments || "N/A"}. Notas: ${prospect.privateNotes || "N/A"}`,
        createdAt: new Date()
      });
    }

    // Link prospect
    await db
      .update(schema.rapidActivityProspects)
      .set({ convertedToContactId: contactId })
      .where(eq(schema.rapidActivityProspects.id, id));

    return NextResponse.json({
      success: true,
      contactId,
      message: "¡Prospecto convertido a Registro Social con éxito!"
    });
  } catch (error: unknown) {
    console.error("Error converting prospect:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al convertir prospecto.") }, { status: 500 });
  }
}
