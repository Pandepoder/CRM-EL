import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getDatabaseClient } from "@/lib/db-client";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { sql } from "drizzle-orm";


/**
 * GET /api/map/sections/geojson
 * Returns a GeoJSON FeatureCollection of electoral sections.
 * Uses the geom_json column if available, filtered by municipality.
 */
export async function GET(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const url = new URL(req.url);
  const targetMunicipality = url.searchParams.get("municipality") || "Tonalá";

  const db = getDatabaseClient();

  try {
    const isFilterAll = !targetMunicipality || targetMunicipality.toLowerCase() === "all";

    const result = await db.execute<{
      id: string;
      section_num: number;
      geom_json: any;
      colonies: string[];
      municipality: string;
      contacts_count: string;
      visits_scheduled: string;
      visits_completed: string;
      incidents_active: string;
      incidents_resolved: string;
      representatives: Array<{ name: string; role: string }>;
    }>(sql`
      SELECT
        es.id::text AS id,
        es.section_num,
        es.geom_json,
        COALESCE(es.municipality, 'Tonalá') AS municipality,
        COALESCE(ARRAY_AGG(DISTINCT col.name) FILTER (WHERE col.name IS NOT NULL), '{}') AS colonies,
        COUNT(DISTINCT cont.id)::text AS contacts_count,
        COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'scheduled')::text AS visits_scheduled,
        COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'completed')::text AS visits_completed,
        COUNT(DISTINCT rep.id) FILTER (WHERE rep.status = 'active')::text AS incidents_active,
        COUNT(DISTINCT rep.id) FILTER (WHERE rep.status = 'resolved')::text AS incidents_resolved,
        COALESCE(
          JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('name', u.display_name, 'role', erep.role)) 
          FILTER (WHERE erep.id IS NOT NULL), 
          '[]'::json
        ) AS representatives
      FROM electoral_sections es
      LEFT JOIN section_colonies sc ON sc.section_id = es.id
      LEFT JOIN colonies col ON col.id = sc.colony_id
      LEFT JOIN contacts cont ON cont.section_id = es.id AND cont.status = 'active'
      LEFT JOIN visits v ON v.contact_id = cont.id
      LEFT JOIN event_reports rep ON rep.section_id = es.id
      LEFT JOIN electoral_representatives erep ON erep.section_id = es.id
      LEFT JOIN user_profiles u ON u.id = erep.user_id
      WHERE es.geom_json IS NOT NULL
        ${isFilterAll ? sql`` : sql`AND LOWER(es.municipality) = LOWER(${targetMunicipality})`}
      GROUP BY es.id, es.section_num, es.municipality, es.geom_json
      ORDER BY es.section_num ASC
    `);

    const features = result.rows
      .filter(row => row.geom_json)
      .map(row => {
        let geometry: any;
        try {
          geometry = typeof row.geom_json === "string"
            ? JSON.parse(row.geom_json)
            : row.geom_json;
        } catch {
          return null;
        }
        return {
          type: "Feature",
          id: row.section_num,
          properties: {
            id: row.id,
            section_num: row.section_num,
            name: `Sección ${row.section_num}`,
            municipality: row.municipality || "Tonalá",
            colonies: (row.colonies || []).filter(c => c && !c.startsWith("Cabecera ") && !c.startsWith("Municipio ")),
            contactsCount: Number(row.contacts_count || 0),
            visitsScheduled: Number(row.visits_scheduled || 0),
            visitsCompleted: Number(row.visits_completed || 0),
            incidentsActive: Number(row.incidents_active || 0),
            incidentsResolved: Number(row.incidents_resolved || 0),
            representatives: typeof row.representatives === "string" ? JSON.parse(row.representatives) : (row.representatives || [])
          },
          geometry,
        };
      })
      .filter((f): f is NonNullable<typeof f> => Boolean(f));

    return NextResponse.json({
      type: "FeatureCollection",
      features,
    });
  } catch (error) {
    console.error("Failed to load sections GeoJSON:", error);
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }
}
