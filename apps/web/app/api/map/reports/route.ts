import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getDatabaseClient } from "@/lib/db-client";
import { requireActorPermission, Permission } from "@/lib/authorization";
import { schema } from "@tonala/shared/database";
const { eventReports } = schema;
import { desc, eq } from "drizzle-orm";
import { withOutbox } from "@/lib/outbox-helper";
import { randomUUID } from "crypto";
import { point } from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

export async function GET(_request: Request) {
  const actor = await requireActorPermission(Permission.DashboardRead);
  if (actor instanceof NextResponse) return actor;

  const db = getDatabaseClient();

  try {
    const reports = await db
      .select({
        id: eventReports.id,
        title: eventReports.title,
        description: eventReports.description,
        category: eventReports.category,
        status: eventReports.status,
        municipality: eventReports.municipality,
        district: eventReports.district,
        sectionId: eventReports.sectionId,
        assignedToUserId: eventReports.assignedToUserId,
        eventDate: eventReports.eventDate,
        createdAt: eventReports.createdAt,
        longitude: eventReports.longitude,
        latitude: eventReports.latitude,
        sectionNum: schema.electoralSections.sectionNum
      })
      .from(eventReports)
      .leftJoin(schema.electoralSections, eq(eventReports.sectionId, schema.electoralSections.id))
      .orderBy(desc(eventReports.createdAt));

    const geoJson = {
      type: "FeatureCollection",
      features: reports.map((report) => ({
        type: "Feature",
        properties: {
          id: report.id,
          title: report.title,
          description: report.description,
          category: report.category,
          status: report.status,
          municipality: report.municipality,
          district: report.district,
          sectionId: report.sectionId,
          sectionNum: report.sectionNum,
          assignedToUserId: report.assignedToUserId,
          eventDate: report.eventDate,
          createdAt: report.createdAt
        },
        geometry: {
          type: "Point",
          coordinates: [Number(report.longitude), Number(report.latitude)]
        }
      }))
    };

    return NextResponse.json(geoJson);
  } catch (error: any) {
    console.error("Failed to fetch reports", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const actor = await requireActorPermission(Permission.DashboardRead);
  if (actor instanceof NextResponse) return actor;

  try {
    const body = await request.json();
    const { title, description, latitude, longitude, category, municipality, district, eventDate, sectionId, assignedToUserId } = body;

    if (!title || !description || latitude === undefined || longitude === undefined || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = randomUUID();
    let newReport: any = null;

    const parsedEventDate = eventDate ? new Date(eventDate) : undefined;

    let finalSectionId = sectionId;
    if (!finalSectionId && latitude !== undefined && longitude !== undefined) {
      const db = getDatabaseClient();
      const sections = await db.select({ id: schema.electoralSections.id, geomJson: schema.electoralSections.geomJson }).from(schema.electoralSections);
      const pt = point([Number(longitude), Number(latitude)]);

      for (const section of sections) {
        if (section.geomJson) {
          try {
            const rawGeom: any = typeof section.geomJson === "string" ? JSON.parse(section.geomJson) : section.geomJson;
            const polyFeature = rawGeom.type === "Feature" ? rawGeom : { type: "Feature" as const, geometry: rawGeom, properties: {} };
            const isInside = booleanPointInPolygon(pt, polyFeature);
            if (isInside) {
              finalSectionId = section.id;
              break;
            }
          } catch (e) {
            console.error("Error checking polygon for section", section.id, e);
          }
        }
      }
    }

    // Auto-resolve municipality if missing
    let finalMunicipality = municipality;
    if (!finalMunicipality && latitude !== undefined && longitude !== undefined) {
      if (longitude >= -103.285 && longitude <= -103.170 && latitude >= 20.570 && latitude <= 20.685) finalMunicipality = "Tonalá";
      else if (longitude >= -103.395 && longitude <= -103.285 && latitude >= 20.620 && latitude <= 20.735) finalMunicipality = "Guadalajara";
      else if (longitude >= -103.520 && longitude <= -103.350 && latitude >= 20.635 && latitude <= 20.820) finalMunicipality = "Zapopan";
      else if (longitude >= -103.420 && longitude <= -103.275 && latitude >= 20.550 && latitude <= 20.640) finalMunicipality = "San Pedro Tlaquepaque";
      else if (longitude >= -103.500 && longitude <= -103.310 && latitude >= 20.410 && latitude <= 20.570) finalMunicipality = "Tlajomulco de Zúñiga";
      else if (longitude >= -103.285 && longitude <= -103.175 && latitude >= 20.470 && latitude <= 20.570) finalMunicipality = "El Salto";
      else if (longitude >= -103.170 && longitude <= -103.020 && latitude >= 20.570 && latitude <= 20.730) finalMunicipality = "Zapotlanejo";
      else if (longitude >= -103.260 && longitude <= -103.140 && latitude >= 20.350 && latitude <= 20.460) finalMunicipality = "Ixtlahuacán de los Membrillos";
      else if (longitude >= -103.200 && longitude <= -103.120 && latitude >= 20.470 && latitude <= 20.550) finalMunicipality = "Juanacatlán";
      else finalMunicipality = "Tonalá";
    }

    await withOutbox("event_report", id, "EventReportCreated.v1", { id, title, description, latitude, longitude, category, municipality: finalMunicipality, district, eventDate: parsedEventDate, sectionId: finalSectionId, assignedToUserId }, actor.actorId, async (tx) => {
      const [inserted] = await tx
        .insert(eventReports)
        .values({
          id,
          title,
          description,
          latitude,
          longitude,
          category,
          municipality: finalMunicipality,
          district,
          sectionId: finalSectionId,
          assignedToUserId,
          eventDate: parsedEventDate,
          createdByUserId: actor.actorId,
        })
        .returning();
      newReport = inserted;
    });

    return NextResponse.json(newReport, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create report", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
