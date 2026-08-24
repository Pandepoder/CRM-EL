import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { sql } from "drizzle-orm";

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
    // Try to get real geometry from electoral_sections
    const result = await db.execute<{
      id: string;
      section_num: number;
      geom_json: string | null;
    }>(sql`
      SELECT
        id::text,
        section_num,
        geom_json
      FROM electoral_sections
      WHERE geom_json IS NOT NULL
      ORDER BY section_num ASC
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
            section_num: row.section_num,
            name: `Sección ${row.section_num}`,
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
