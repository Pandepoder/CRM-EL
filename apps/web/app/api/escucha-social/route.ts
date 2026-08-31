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

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    const db = getDatabaseClient();
    const networkScope = await resolveUserNetworkScope(session.userId);

    let query = db
      .select({
        id: schema.socialListening.id,
        contactId: schema.socialListening.contactId,
        categories: schema.socialListening.categories,
        title: schema.socialListening.title,
        description: schema.socialListening.description,
        photoUrls: schema.socialListening.photoUrls,
        latitude: schema.socialListening.latitude,
        longitude: schema.socialListening.longitude,
        locationText: schema.socialListening.locationText,
        status: schema.socialListening.status,
        isFormalGestion: schema.socialListening.isFormalGestion,
        approvedByUserId: schema.socialListening.approvedByUserId,
        resolutionNotes: schema.socialListening.resolutionNotes,
        createdByUserId: schema.socialListening.createdByUserId,
        createdByName: schema.userProfiles.displayName,
        createdAt: schema.socialListening.createdAt
      })
      .from(schema.socialListening)
      .leftJoin(schema.userProfiles, eq(schema.socialListening.createdByUserId, schema.userProfiles.id))
      .$dynamic();

    if (!networkScope.isGlobal && networkScope.allowedUserIds && networkScope.allowedUserIds.length > 0) {
      query = query.where(inArray(schema.socialListening.createdByUserId, networkScope.allowedUserIds));
    }

    const records = await query.orderBy(desc(schema.socialListening.createdAt));

    let filtered = records;
    if (status && status !== "all") {
      filtered = filtered.filter(r => r.status === status);
    }

    return NextResponse.json({
      items: filtered,
      total: filtered.length
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/escucha-social:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al obtener registros.") }, { status: 500 });
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
      contactId,
      categories = ["propuesta"],
      title,
      description,
      photoUrls = [],
      latitude,
      longitude,
      locationText,
      isFormalGestion = 0
    } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "Título y descripción son requeridos." }, { status: 400 });
    }

    const db = getDatabaseClient();

    const [inserted] = await db
      .insert(schema.socialListening)
      .values({
        contactId: contactId || null,
        categories: Array.isArray(categories) ? categories : [categories],
        title: title.trim(),
        description: description.trim(),
        photoUrls: Array.isArray(photoUrls) ? photoUrls : [],
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        locationText: locationText ? locationText.trim() : null,
        status: "pendiente",
        isFormalGestion: isFormalGestion ? 1 : 0,
        createdByUserId: session.userId,
        createdAt: new Date()
      })
      .returning();

    return NextResponse.json({
      success: true,
      item: inserted
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/escucha-social:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al registrar reporte.") }, { status: 500 });
  }
}
