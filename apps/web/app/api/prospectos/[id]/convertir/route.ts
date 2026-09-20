import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { Permission, requireActorPermission } from "@/lib/authorization";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import crypto from "crypto";
import { safeErrorMessage } from "@/lib/safe-error";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Convertir un prospecto da de alta una ficha de ciudadano a mano, sin pasar
    // por el caso de uso de alta: por aquí un brigadista registraba ciudadanos,
    // que es justo lo que el mapa de permisos le niega a propósito.
    const actor = await requireActorPermission(Permission.ContactsCreate);
    if (actor instanceof NextResponse) return actor;

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

    // El prospecto se leía por id sin filtro de alcance: con el identificador a la
    // vista, cualquiera convertía el registro rápido de otra brigada y se quedaba
    // con el ciudadano a su nombre. Se responde 404 y no 403 para no confirmar que
    // el identificador existe.
    const alcance = await resolveUserNetworkScope(actor.actorId);
    if (!alcance.isGlobal && !(alcance.allowedUserIds ?? []).includes(prospect.createdByUserId)) {
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
      createdByUserId: actor.actorId,
      referredByUserId: actor.actorId,
      actualContactUserId: actor.actorId,
      firstName: prospect.prospectName.split(" ")[0] || prospect.prospectName,
      lastName: prospect.prospectName.split(" ").slice(1).join(" ") || "",
      profession: prospect.organizationOrReference || "Prospecto",
      interests: `Perfil ${prospect.profileType}`,
      origin: "toca_toca",
      firstContactDate: prospect.activityDate || new Date(),
      colony: prospect.locationText || "Por identificar",
      // El registro rápido no captura municipio: se deja vacío en vez de suponer Tonalá.
      municipality: null,
      knowMeBetter: prospect.dispositionNotes || null,
      createdAt: new Date(),
      version: 1
    });

    // Insert Note with past commitments
    if (prospect.commitments || prospect.privateNotes) {
      await db.insert(schema.contactNotes).values({
        contactId,
        authorUserId: actor.actorId,
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
