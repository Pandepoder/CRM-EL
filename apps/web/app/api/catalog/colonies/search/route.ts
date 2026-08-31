import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq, ilike, and, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const section = searchParams.get("section") || "";
    const zip = searchParams.get("zip") || "";
    const mun = searchParams.get("mun") || "";

    const db = getDatabaseClient();

    let baseQuery = db.select({
      id: schema.colonies.id,
      name: schema.colonies.name,
      postalCode: schema.colonies.postalCode,
      municipality: schema.colonies.municipality
    }).from(schema.colonies);

    if (section) {
      baseQuery = baseQuery
        .innerJoin(schema.sectionColonies, eq(schema.colonies.id, schema.sectionColonies.colonyId))
        .innerJoin(schema.electoralSections, eq(schema.sectionColonies.sectionId, schema.electoralSections.id)) as any;
    }

    const finalConditions = [];
    if (section) {
      const parsed = parseInt(section, 10);
      if (!isNaN(parsed)) {
        finalConditions.push(eq(schema.electoralSections.sectionNum, parsed));
      }
    }
    if (zip) {
      finalConditions.push(eq(schema.colonies.postalCode, zip));
    }
    if (mun) {
      const normalizedMun = mun.toLowerCase().trim();
      let targetMun = mun;
      if (normalizedMun.includes("tonal")) targetMun = "Tonalá";
      else if (normalizedMun.includes("guadalajara")) targetMun = "Guadalajara";
      else if (normalizedMun.includes("zapopan")) targetMun = "Zapopan";
      else if (normalizedMun.includes("tlaquepaque")) targetMun = "San Pedro Tlaquepaque";
      else if (normalizedMun.includes("tlajomulco")) targetMun = "Tlajomulco de Zúñiga";
      else if (normalizedMun.includes("salto")) targetMun = "El Salto";
      else if (normalizedMun.includes("zapotlanejo")) targetMun = "Zapotlanejo";

      finalConditions.push(
        sql`(${schema.colonies.municipality} ILIKE ${'%' + targetMun + '%'} OR ${schema.colonies.municipality} ILIKE ${'%' + mun + '%'})`
      );
    }
    if (q) {
      finalConditions.push(ilike(schema.colonies.name, `%${q}%`));
    }

    if (finalConditions.length > 0) {
      baseQuery = baseQuery.where(and(...finalConditions)) as any;
    }

    const results = await (baseQuery as any).limit(50);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error searching colonies:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
