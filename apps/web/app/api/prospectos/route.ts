import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq, desc, inArray } from "drizzle-orm";
import { getServerSession } from "@/lib/session-server";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { safeErrorMessage } from "@/lib/safe-error";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const db = getDatabaseClient();
    const networkScope = await resolveUserNetworkScope(session.userId);

    let query = db
      .select({
        id: schema.rapidActivityProspects.id,
        prospectName: schema.rapidActivityProspects.prospectName,
        organizationOrReference: schema.rapidActivityProspects.organizationOrReference,
        profileType: schema.rapidActivityProspects.profileType,
        disposition: schema.rapidActivityProspects.disposition,
        dispositionNotes: schema.rapidActivityProspects.dispositionNotes,
        activityDate: schema.rapidActivityProspects.activityDate,
        locationText: schema.rapidActivityProspects.locationText,
        commitments: schema.rapidActivityProspects.commitments,
        privateNotes: schema.rapidActivityProspects.privateNotes,
        convertedToContactId: schema.rapidActivityProspects.convertedToContactId,
        createdByUserId: schema.rapidActivityProspects.createdByUserId,
        createdByName: schema.userProfiles.displayName,
        createdAt: schema.rapidActivityProspects.createdAt
      })
      .from(schema.rapidActivityProspects)
      .leftJoin(schema.userProfiles, eq(schema.rapidActivityProspects.createdByUserId, schema.userProfiles.id))
      .$dynamic();

    if (!networkScope.isGlobal && networkScope.allowedUserIds && networkScope.allowedUserIds.length > 0) {
      query = query.where(inArray(schema.rapidActivityProspects.createdByUserId, networkScope.allowedUserIds));
    }

    const items = await query.orderBy(desc(schema.rapidActivityProspects.activityDate));

    return NextResponse.json({
      items,
      total: items.length
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/prospectos:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al obtener prospectos.") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      prospectName,
      organizationOrReference,
      profileType = "vecinal",
      disposition = "interesado",
      dispositionNotes,
      locationText,
      commitments,
      privateNotes
    } = body;

    if (!prospectName || !prospectName.trim()) {
      return NextResponse.json({ error: "Nombre del prospecto requerido." }, { status: 400 });
    }

    const db = getDatabaseClient();

    const [inserted] = await db
      .insert(schema.rapidActivityProspects)
      .values({
        prospectName: prospectName.trim(),
        organizationOrReference: organizationOrReference ? organizationOrReference.trim() : null,
        profileType,
        disposition,
        dispositionNotes: dispositionNotes ? dispositionNotes.trim() : null,
        locationText: locationText ? locationText.trim() : null,
        commitments: commitments ? commitments.trim() : null,
        privateNotes: privateNotes ? privateNotes.trim() : null,
        createdByUserId: session.userId,
        createdAt: new Date()
      })
      .returning();

    return NextResponse.json({
      success: true,
      item: inserted
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/prospectos:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al registrar prospecto.") }, { status: 500 });
  }
}

