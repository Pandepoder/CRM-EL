import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getDatabaseClient } from "@/lib/db-client";
import { getServerSession } from "@/lib/session-server";
import { sql } from "drizzle-orm";
import { z } from "zod";

const createSectionSchema = z.object({
  sectionNum: z.coerce.number().int().positive(),
  municipality: z.string().min(1).default("Tonalá"),
  colony: z.string().optional(),
  colonies: z.array(z.string()).optional(),
  geom: z.any().optional(),
});

function getDefaultGeometryForMunicipality(municipality: string, sectionNum: number) {
  const centers: Record<string, [number, number]> = {
    "Tonalá": [-103.2422, 20.6248],
    "Guadalajara": [-103.3496, 20.6767],
    "Zapopan": [-103.3886, 20.7214],
    "San Pedro Tlaquepaque": [-103.3150, 20.6400],
    "Tlajomulco de Zúñiga": [-103.4167, 20.4740],
    "El Salto": [-103.2333, 20.5167],
    "Zapotlanejo": [-103.0667, 20.6222],
    "Ixtlahuacán de los Membrillos": [-103.1833, 20.3833],
    "Juanacatlán": [-103.1667, 20.5000],
  };

  const center = centers[municipality] || centers["Tonalá"]!;
  // Create a small bounding polygon box around the center with slight offset
  const offset = 0.006;
  const hash = (sectionNum % 10) * 0.002;
  const cLng = center[0] + hash;
  const cLat = center[1] + hash;

  return {
    type: "Polygon",
    coordinates: [[
      [cLng - offset, cLat - offset],
      [cLng + offset, cLat - offset],
      [cLng + offset, cLat + offset],
      [cLng - offset, cLat + offset],
      [cLng - offset, cLat - offset]
    ]]
  };
}

/**
 * GET /api/electoral/sections
 * Returns list of electoral sections with their assigned colonies and municipality
 */
export async function GET() {
  const db = getDatabaseClient();
  try {
    const result = await db.execute<{
      id: string;
      section_num: number;
      municipality: string;
      colonies: string[];
      contacts_count: string;
    }>(sql`
      SELECT
        es.id::text,
        es.section_num,
        COALESCE(es.municipality, 'Tonalá') AS municipality,
        COALESCE(ARRAY_AGG(DISTINCT col.name) FILTER (WHERE col.name IS NOT NULL), '{}') AS colonies,
        COUNT(DISTINCT cont.id)::text AS contacts_count
      FROM electoral_sections es
      LEFT JOIN section_colonies sc ON sc.section_id = es.id
      LEFT JOIN colonies col ON col.id = sc.colony_id
      LEFT JOIN contacts cont ON cont.section_id = es.id
      GROUP BY es.id, es.section_num, es.municipality
      ORDER BY es.section_num ASC
    `);

    return NextResponse.json({
      sections: result.rows.map(r => ({
        id: r.id,
        sectionNum: r.section_num,
        municipality: r.municipality,
        colonies: r.colonies || [],
        contactsCount: Number(r.contacts_count || 0)
      }))
    });
  } catch (error) {
    console.error("Failed to fetch electoral sections:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/electoral/sections
 * Creates or updates an electoral section in the database
 */
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session.isLoggedIn || !["admin", "direction", "territorial_coordinator"].includes(session.roleKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createSectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de sección inválidos", details: parsed.error.issues }, { status: 400 });
    }

    const { sectionNum, municipality, colony, colonies, geom } = parsed.data;
    const db = getDatabaseClient();

    // Prepare geometry
    const geomData = geom || getDefaultGeometryForMunicipality(municipality, sectionNum);
    const geomJson = JSON.stringify(geomData);

    // 1. Insert or update section in electoral_sections
    const secRes = await db.execute<{ id: string; section_num: number }>(sql`
      INSERT INTO electoral_sections (section_num, geom_json)
      VALUES (${sectionNum}, ${sql`${geomJson}::jsonb`})
      ON CONFLICT (section_num) DO UPDATE
      SET geom_json = COALESCE(electoral_sections.geom_json, EXCLUDED.geom_json)
      RETURNING id::text, section_num
    `);

    const section = secRes.rows[0];
    if (!section) {
      return NextResponse.json({ error: "Error al registrar la sección" }, { status: 500 });
    }

    // 2. Link colonies if provided
    const coloniesToAdd: string[] = [];
    if (colony && colony.trim()) coloniesToAdd.push(colony.trim());
    if (colonies && Array.isArray(colonies)) {
      for (const c of colonies) {
        if (c && c.trim() && !coloniesToAdd.includes(c.trim())) {
          coloniesToAdd.push(c.trim());
        }
      }
    }

    if (coloniesToAdd.length > 0) {
      // Find or create default catalog version
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

      if (catalogVersionId) {
        for (const colName of coloniesToAdd) {
          const colRes = await db.execute<{ id: string }>(sql`
            INSERT INTO colonies (catalog_version_id, name, postal_code, municipality, status)
            VALUES (${catalogVersionId}::uuid, ${colName}, '45400', ${municipality}, 'active')
            ON CONFLICT (catalog_version_id, name, municipality) DO UPDATE SET status = 'active'
            RETURNING id::text
          `);
          const colonyId = colRes.rows[0]?.id;
          if (colonyId) {
            await db.execute(sql`
              INSERT INTO section_colonies (section_id, colony_id)
              VALUES (${section.id}::uuid, ${colonyId}::uuid)
              ON CONFLICT (section_id, colony_id) DO NOTHING
            `);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sección electoral #${sectionNum} registrada con éxito.`,
      section: {
        id: section.id,
        sectionNum: section.section_num,
        municipality,
        colonies: coloniesToAdd
      }
    });
  } catch (error: any) {
    console.error("Failed to create electoral section:", error);
    return NextResponse.json({ error: "Error en base de datos al registrar la sección." }, { status: 500 });
  }
}
