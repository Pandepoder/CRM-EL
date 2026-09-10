import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getDatabaseClient } from "@/lib/db-client";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { sql } from "drizzle-orm";
import { buscarMunicipio } from "@/lib/municipios-jalisco";

/**
 * GET /api/catalog/colonies/search
 * Searches verified colonies and section mappings in the database.
 * Query parameters:
 *  - mun: municipio del catálogo, o "all" (por omisión) para todo Jalisco
 *  - section: Specific electoral section number (optional)
 *  - q: Search string query (optional)
 */
export async function GET(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const url = new URL(req.url);
  const munParam = url.searchParams.get("mun");
  const todoJalisco = !munParam || munParam.toLowerCase() === "all";
  const municipality = todoJalisco ? null : (buscarMunicipio(munParam)?.name ?? null);
  // Un municipio que no está en el catálogo no devuelve el catálogo entero de Jalisco.
  if (!todoJalisco && !municipality) return NextResponse.json([]);
  const sectionStr = url.searchParams.get("section");
  const q = (url.searchParams.get("q") || "").trim();

  const db = getDatabaseClient();

  try {
    const sectionNum = sectionStr && !isNaN(parseInt(sectionStr, 10)) ? parseInt(sectionStr, 10) : null;

    const result = await db.execute<{
      id: string;
      name: string;
      postal_code: string | null;
      municipality: string | null;
      section_num: number | null;
    }>(sql`
      SELECT
        col.id::text AS id,
        col.name,
        col.postal_code,
        COALESCE(col.municipality, es.municipality) AS municipality,
        MIN(es.section_num) AS section_num
      FROM colonies col
      LEFT JOIN section_colonies sc ON sc.colony_id = col.id
      LEFT JOIN electoral_sections es ON es.id = sc.section_id
      WHERE col.status = 'active'
        AND col.name NOT LIKE 'Cabecera %'
        AND col.name NOT LIKE 'Municipio %'
        -- Nombre completo, no las cuatro primeras letras con comodines: "%Tona%" también
        -- traía colonias de Tonaya, y "%San %" de una docena de municipios.
        ${municipality ? sql`AND (col.municipality = ${municipality} OR (col.municipality IS NULL AND es.municipality = ${municipality}))` : sql``}
        ${sectionNum ? sql`AND es.section_num = ${sectionNum}` : sql``}
        ${q ? sql`AND col.name ILIKE ${`%${q}%`}` : sql``}
      GROUP BY col.id, col.name, col.postal_code, col.municipality, es.municipality
      ORDER BY 
        ${q ? sql`CASE WHEN col.name ILIKE ${`${q}%`} THEN 1 ELSE 2 END,` : sql``}
        col.name ASC
      LIMIT 25
    `);

    const formatted = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      // Sin CP conocido se deja vacío; antes se rellenaba con el de Tonalá.
      postalCode: row.postal_code || "",
      municipality: row.municipality ?? "",
      sectionNum: row.section_num || undefined,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error searching colonies catalog:", error);
    return NextResponse.json([]);
  }
}
