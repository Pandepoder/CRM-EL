import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getDatabaseClient } from "@/lib/db-client";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { sql } from "drizzle-orm";

/**
 * GET /api/catalog/colonies/search
 * Searches verified colonies and section mappings in the database.
 * Query parameters:
 *  - mun: Municipality name (default: "Tonalá")
 *  - section: Specific electoral section number (optional)
 *  - q: Search string query (optional)
 */
export async function GET(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const url = new URL(req.url);
  const municipality = url.searchParams.get("mun") || "Tonalá";
  const sectionStr = url.searchParams.get("section");
  const q = (url.searchParams.get("q") || "").trim();

  const db = getDatabaseClient();

  try {
    const sectionNum = sectionStr && !isNaN(parseInt(sectionStr, 10)) ? parseInt(sectionStr, 10) : null;

    const result = await db.execute<{
      id: string;
      name: string;
      postal_code: string | null;
      municipality: string;
      section_num: number | null;
    }>(sql`
      SELECT DISTINCT
        col.id::text AS id,
        col.name,
        col.postal_code,
        COALESCE(col.municipality, es.municipality, ${municipality}) AS municipality,
        es.section_num
      FROM colonies col
      LEFT JOIN section_colonies sc ON sc.colony_id = col.id
      LEFT JOIN electoral_sections es ON es.id = sc.section_id
      WHERE col.status = 'active'
        AND col.name NOT LIKE 'Cabecera %'
        AND col.name NOT LIKE 'Municipio %'
        ${municipality && municipality.toLowerCase() !== "all" ? sql`AND (LOWER(col.municipality) = LOWER(${municipality}) OR col.municipality IS NULL)` : sql``}
        ${sectionNum ? sql`AND es.section_num = ${sectionNum}` : sql``}
        ${q ? sql`AND col.name ILIKE ${`%${q}%`}` : sql``}
      ORDER BY 
        ${q ? sql`CASE WHEN col.name ILIKE ${`${q}%`} THEN 1 ELSE 2 END,` : sql``}
        col.name ASC
      LIMIT 25
    `);

    const formatted = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      postalCode: row.postal_code || "45400",
      municipality: row.municipality,
      sectionNum: row.section_num || undefined,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error searching colonies catalog:", error);
    return NextResponse.json([]);
  }
}
