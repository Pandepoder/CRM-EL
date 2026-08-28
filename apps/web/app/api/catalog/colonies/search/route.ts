import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq, ilike, and } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

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
      finalConditions.push(ilike(schema.colonies.municipality, `%${mun}%`));
    }
    if (q) {
      finalConditions.push(ilike(schema.colonies.name, `%${q}%`));
    }

    if (finalConditions.length > 0) {
      baseQuery = baseQuery.where(and(...finalConditions)) as any;
    }

    const results = await baseQuery;

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error searching colonies:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
