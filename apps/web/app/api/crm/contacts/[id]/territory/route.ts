import { DevelopmentLogger } from "@tonala/shared/observability";
import { linkContactToColony } from "@tonala/modules/territory/application";
import { schema, encryptData } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { createTerritoryMutationsDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { processOutboxInline } from "@/lib/outbox";
import { actorFromSession, permissionChecker, resultToResponse, unauthorized } from "@/lib/api-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id } = await params;
  const body = (await request.json()) as { 
    colonyId?: string; 
    colonyName?: string;
    municipality?: string;
    sectionNum?: number | string;
  };

  const db = getDatabaseClient();
  let targetColonyId = body.colonyId || "";
  const colonyName = (body.colonyName || "").trim();
  const municipality = (body.municipality || "Tonalá").trim();
  const sectionNum = typeof body.sectionNum === "number" ? body.sectionNum : parseInt(String(body.sectionNum || ""), 10);

  try {
    let resolvedSectionId: string | null = null;

    // 1. Resolve or create section if sectionNum is provided
    if (!isNaN(sectionNum) && sectionNum > 0) {
      const existingSec = await db
        .select({ id: schema.electoralSections.id })
        .from(schema.electoralSections)
        .where(eq(schema.electoralSections.sectionNum, sectionNum))
        .limit(1);

      if (existingSec[0]) {
        resolvedSectionId = existingSec[0].id;
      } else {
        const offset = 0.005;
        const defaultGeom = {
          type: "Polygon",
          coordinates: [[
            [-103.2422 - offset, 20.6248 - offset],
            [-103.2422 + offset, 20.6248 - offset],
            [-103.2422 + offset, 20.6248 + offset],
            [-103.2422 - offset, 20.6248 + offset],
            [-103.2422 - offset, 20.6248 - offset]
          ]]
        };
        const [newSec] = await db
          .insert(schema.electoralSections)
          .values({ sectionNum, geomJson: defaultGeom })
          .returning({ id: schema.electoralSections.id });
        if (newSec) resolvedSectionId = newSec.id;
      }
    }

    // 2. Resolve or create colony in catalog if colonyName is provided
    if (colonyName) {
      const catRes = await db
        .select({ id: schema.catalogVersions.id })
        .from(schema.catalogVersions)
        .orderBy(schema.catalogVersions.importedAt)
        .limit(1);

      let catalogVersionId = catRes[0]?.id;
      if (!catalogVersionId) {
        const [newCat] = await db
          .insert(schema.catalogVersions)
          .values({
            catalogType: "colonies",
            sourceName: "manual-entry",
            sourceVersion: "v1.0"
          })
          .returning({ id: schema.catalogVersions.id });
        catalogVersionId = newCat?.id;
      }

      if (catalogVersionId) {
        const [colonyRow] = await db
          .insert(schema.colonies)
          .values({
            catalogVersionId,
            name: colonyName,
            municipality,
            postalCode: "45400",
            status: "active"
          })
          .onConflictDoUpdate({
            target: [schema.colonies.catalogVersionId, schema.colonies.name],
            set: { status: "active", municipality }
          })
          .returning({ id: schema.colonies.id });

        if (colonyRow) {
          targetColonyId = colonyRow.id;
          if (resolvedSectionId) {
            await db
              .insert(schema.sectionColonies)
              .values({
                sectionId: resolvedSectionId,
                colonyId: colonyRow.id
              })
              .onConflictDoNothing();
          }
        }
      }
    }

    // 3. Update direct fields in contacts table
    const updateFields: Record<string, any> = {};
    if (colonyName) updateFields.colony = encryptData(colonyName);
    if (municipality) updateFields.municipality = encryptData(municipality);
    if (resolvedSectionId) updateFields.sectionId = resolvedSectionId;

    if (Object.keys(updateFields).length > 0) {
      await db
        .update(schema.contacts)
        .set(updateFields)
        .where(eq(schema.contacts.id, id));
    }

    // 4. Link via territory application module if targetColonyId is present
    if (targetColonyId) {
      const deps = await createTerritoryMutationsDependencies(db);
      const result = await linkContactToColony(actor, {
        contactId: id,
        colonyId: targetColonyId
      }, {
        ...deps,
        logger: new DevelopmentLogger(),
        permissionChecker
      });

      if (result.ok) {
        await processOutboxInline(db);
      }
      return resultToResponse(result);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Error updating contact territory:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
