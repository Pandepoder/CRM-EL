import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getDatabaseClient } from "@/lib/db-client";
import { requireActorPermission, Permission } from "@/lib/authorization";
import { sql } from "drizzle-orm";
import { z } from "zod";

const importSectionsSchema = z.object({
  sections: z.array(
    z.object({
      sectionNum: z.number().int().positive(),
      geom: z.any().optional(),
      colonies: z.array(z.string()).optional(),
    })
  )
});

/**
 * GET /api/admin/sections
 * Lists all electoral sections with their assigned colonies, representatives, and statistics.
 */
export async function GET() {
  const actor = await requireActorPermission(Permission.DashboardRead);
  if (actor instanceof NextResponse) return actor;

  const db = getDatabaseClient();

  try {
    const result = await db.execute<{
      id: string;
      section_num: number;
      has_geom: boolean;
      colonies: string[];
      contacts_count: string;
      reps_count: string;
    }>(sql`
      SELECT
        es.id::text,
        es.section_num,
        (es.geom_json IS NOT NULL) AS has_geom,
        COALESCE(ARRAY_AGG(DISTINCT col.name) FILTER (WHERE col.name IS NOT NULL), '{}') AS colonies,
        COUNT(DISTINCT cont.id)::text AS contacts_count,
        COUNT(DISTINCT erep.id)::text AS reps_count
      FROM electoral_sections es
      LEFT JOIN section_colonies sc ON sc.section_id = es.id
      LEFT JOIN colonies col ON col.id = sc.colony_id
      LEFT JOIN contacts cont ON cont.section_id = es.id
      LEFT JOIN electoral_representatives erep ON erep.section_id = es.id
      GROUP BY es.id, es.section_num
      ORDER BY es.section_num ASC
    `);

    return NextResponse.json({
      sections: result.rows.map(r => ({
        id: r.id,
        sectionNum: r.section_num,
        hasGeom: Boolean(r.has_geom),
        colonies: r.colonies,
        contactsCount: Number(r.contacts_count || 0),
        repsCount: Number(r.reps_count || 0),
      }))
    });
  } catch (error) {
    console.error("Failed to list sections:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/sections
 * Bulk import or create official electoral sections with GeoJSON geometries and colony associations.
 */
export async function POST(request: Request) {
  const actor = await requireActorPermission(Permission.DashboardRead);
  if (actor instanceof NextResponse) return actor;

  try {
    const body = await request.json();
    const parsed = importSectionsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });
    }

    const db = getDatabaseClient();

    // Get catalog version
    const catRes = await db.execute<{ id: string }>(sql`
      SELECT id::text FROM catalog_versions ORDER BY imported_at DESC LIMIT 1
    `);
    const catalogVersionId = catRes.rows[0]?.id;

    let importedCount = 0;

    for (const sec of parsed.data.sections) {
      const geomJson = sec.geom ? JSON.stringify(sec.geom) : null;
      
      const secRes = await db.execute<{ id: string }>(sql`
        INSERT INTO electoral_sections (section_num, geom_json)
        VALUES (${sec.sectionNum}, ${geomJson ? sql`${geomJson}::jsonb` : null})
        ON CONFLICT (section_num) DO UPDATE
        SET geom_json = COALESCE(EXCLUDED.geom_json, electoral_sections.geom_json)
        RETURNING id::text
      `);

      const sectionId = secRes.rows[0]?.id;

      if (sectionId && sec.colonies && sec.colonies.length > 0 && catalogVersionId) {
        for (const colName of sec.colonies) {
          const colRes = await db.execute<{ id: string }>(sql`
            INSERT INTO colonies (catalog_version_id, name, postal_code, municipality, status)
            VALUES (${catalogVersionId}::uuid, ${colName}, '45400', 'Tonalá', 'active')
            ON CONFLICT (catalog_version_id, name) DO UPDATE SET status = 'active'
            RETURNING id::text
          `);

          const colonyId = colRes.rows[0]?.id;
          if (colonyId) {
            await db.execute(sql`
              INSERT INTO section_colonies (section_id, colony_id)
              VALUES (${sectionId}::uuid, ${colonyId}::uuid)
              ON CONFLICT (section_id, colony_id) DO NOTHING
            `);
          }
        }
      }

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${importedCount} electoral sections.`,
      importedCount
    });
  } catch (error) {
    console.error("Failed to import electoral sections:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
