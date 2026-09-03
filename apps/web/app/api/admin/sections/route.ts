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
    let sectionsToProcess: Array<{ sectionNum: number; geom?: any; colonies?: string[]; municipality?: string }> = [];

    if (Array.isArray(body?.sections)) {
      sectionsToProcess = body.sections;
    } else if (body?.sectionNum) {
      const colArr = body.colonies || (body.colony ? [body.colony] : []);
      sectionsToProcess = [{
        sectionNum: Number(body.sectionNum),
        geom: body.geom,
        colonies: colArr,
        municipality: body.municipality || "Tonalá"
      }];
    } else {
      return NextResponse.json({ error: "Debe proporcionar sectionNum o un arreglo de sections." }, { status: 400 });
    }

    const db = getDatabaseClient();

    // Get catalog version or create default
    const catRes = await db.execute<{ id: string }>(sql`
      SELECT id::text FROM catalog_versions ORDER BY imported_at DESC LIMIT 1
    `);
    let catalogVersionId = catRes.rows[0]?.id;
    if (!catalogVersionId) {
      const newCatRes = await db.execute<{ id: string }>(sql`
        INSERT INTO catalog_versions (catalog_type, source_name, source_version)
        VALUES ('ine_sections', 'manual_import', 'v1.0')
        RETURNING id::text
      `);
      catalogVersionId = newCatRes.rows[0]?.id;
    }

    let importedCount = 0;
    let lastSectionId: string | null = null;

    for (const sec of sectionsToProcess) {
      const muni = sec.municipality || "Tonalá";
      // Sin geometría real la sección se importa sin ella. Antes se le fabricaba
      // un cuadrado alrededor del centro del municipio: al dibujarse en el mapa
      // era indistinguible de una sección auténtica y se superponía a las que sí
      // tienen su contorno del INE. El mapa omite las secciones sin geometría,
      // que es la respuesta honesta cuando no se sabe dónde están.
      const geomJson = sec.geom ? JSON.stringify(sec.geom) : null;
      
      const secRes = await db.execute<{ id: string }>(sql`
        INSERT INTO electoral_sections (section_num, geom_json, municipality)
        VALUES (${sec.sectionNum}, ${sql`${geomJson}::jsonb`}, ${muni})
        ON CONFLICT (section_num) DO UPDATE
        SET geom_json = COALESCE(EXCLUDED.geom_json, electoral_sections.geom_json)
        RETURNING id::text
      `);

      const sectionId = secRes.rows[0]?.id;
      lastSectionId = sectionId || null;

      if (sectionId && sec.colonies && sec.colonies.length > 0 && catalogVersionId) {
        for (const colName of sec.colonies) {
          const colRes = await db.execute<{ id: string }>(sql`
            INSERT INTO colonies (catalog_version_id, name, postal_code, municipality, status)
            VALUES (${catalogVersionId}::uuid, ${colName}, '45400', ${muni}, 'active')
            ON CONFLICT (catalog_version_id, name, municipality) DO UPDATE SET status = 'active'
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
      message: `Procesadas ${importedCount} secciones electorales.`,
      importedCount,
      sectionId: lastSectionId
    });
  } catch (error) {
    console.error("Failed to import electoral sections:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
