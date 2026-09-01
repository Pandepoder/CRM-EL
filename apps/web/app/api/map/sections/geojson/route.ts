import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getDatabaseClient } from "@/lib/db-client";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { sql } from "drizzle-orm";

const TONALA_OFFICIAL_SECTIONS = new Set([
  2650, 2651, 2652, 2653, 2654, 2655, 2656, 2657, 2658, 2659, 2660, 2661, 2663, 2664, 2665, 2666, 2667, 2668, 2669, 2670,
  2671, 2672, 2673, 2674, 2675, 2677, 2678, 2679, 2680, 2681, 2682, 2683, 2684, 2685, 2687, 2688, 2689, 2690, 2691, 2692,
  2693, 2694, 2695, 2696, 2697, 2698, 2699, 2700, 2701, 2702, 2703, 2704, 2705, 2706, 2707, 2708, 2709, 2710, 2712, 2713,
  2714, 2715, 2716, 2717, 2718, 2719, 2720, 2721, 2723, 2724, 2725, 2726, 2727, 2729, 3311, 3704, 3705, 3706, 3707, 3708,
  3709, 3710, 3711, 3712, 3713, 3714, 3715, 3740, 3741, 3742, 3743, 3744, 3745, 3800, 3801, 3802, 3803, 3804, 3805, 3806,
  3861, 3862, 3863, 3864, 3865, 3866, 3867, 3868, 3869, 3870, 3871, 3872, 3873
]);

function inferMunicipalityFromSection(secNum: number, currentMunicipality?: string | null): string {
  if (TONALA_OFFICIAL_SECTIONS.has(secNum)) return "Tonalá";
  if (currentMunicipality && currentMunicipality !== "Tonalá") return currentMunicipality;
  return "Tonalá";
}

/**
 * GET /api/map/sections/geojson
 * Returns a GeoJSON FeatureCollection of electoral sections.
 * Uses the geom_json column if available, otherwise returns empty features.
 */
export async function GET() {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const db = getDatabaseClient();

  try {
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
        COALESCE(ARRAY_AGG(DISTINCT col.name) FILTER (WHERE col.name IS NOT NULL), '{}') AS colonies,
        COALESCE(MIN(col.municipality), 'Tonalá') AS municipality,
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
      GROUP BY es.id, es.section_num, es.geom_json
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
        const resolvedMuni = inferMunicipalityFromSection(row.section_num, row.municipality);
        return {
          type: "Feature",
          id: row.section_num,
          properties: {
            id: row.id,
            section_num: row.section_num,
            name: `Sección ${row.section_num}`,
            municipality: resolvedMuni,
            colonies: row.colonies || [],
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
      .filter(Boolean);

    return NextResponse.json({
      type: "FeatureCollection",
      features,
    });
  } catch (error) {
    console.error("Failed to load sections GeoJSON:", error);
    // Return empty collection — map will show no sections (handled in UI)
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }
}
