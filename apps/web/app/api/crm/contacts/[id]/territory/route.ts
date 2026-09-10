import { DevelopmentLogger } from "@tonala/shared/observability";
import { linkContactToColony } from "@tonala/modules/territory/application";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { createTerritoryMutationsDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { processOutboxInline } from "@/lib/outbox";
import { exigirAccesoAContacto } from "@/lib/permisos-contacto";
import { actorFromSession, permissionChecker, resultToResponse, unauthorized } from "@/lib/api-helpers";
import { buscarMunicipio } from "@/lib/municipios-jalisco";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id } = await params;

  const vetado = await exigirAccesoAContacto(id, actor.actorId, actor.roles);
  if (vetado) return vetado;
  const body = (await request.json()) as { 
    colonyId?: string; 
    colonyName?: string;
    municipality?: string;
    sectionNum?: number | string;
  };

  const db = getDatabaseClient();
  let targetColonyId = body.colonyId || "";
  const colonyName = (body.colonyName || "").trim();
  // Solo un municipio real del catálogo. Antes, sin dato, se escribía "Tonalá" sobre el
  // contacto aunque fuera de otro municipio.
  const municipality = buscarMunicipio(body.municipality)?.name ?? null;
  const sectionNum = typeof body.sectionNum === "number" ? body.sectionNum : parseInt(String(body.sectionNum || ""), 10);

  try {
    let resolvedSectionId: string | null = null;
    let municipioDeSeccion: string | null = null;

    // 1. Resolve or create section if sectionNum is provided
    if (!isNaN(sectionNum) && sectionNum > 0) {
      const existingSec = await db
        .select({ id: schema.electoralSections.id, municipality: schema.electoralSections.municipality })
        .from(schema.electoralSections)
        .where(eq(schema.electoralSections.sectionNum, sectionNum))
        .limit(1);

      if (existingSec[0]) {
        resolvedSectionId = existingSec[0].id;
        municipioDeSeccion = existingSec[0].municipality;
      } else {
        // La base ya tiene la cartografía completa del INE para los 125
        // municipios de Jalisco (secciones 1 a 3891). Si un número no está,
        // no es una sección nueva: es un error de captura.
        //
        // Antes la ruta la daba de alta con una geometría inventada —un
        // cuadrado de 1.1 km sobre el centro del municipio—, así que un dedazo
        // creaba una sección falsa, dibujada encima de las reales, y arrastraba
        // al contacto a un domicilio que no existe. Ahora se avisa y se corrige
        // en captura.
        return NextResponse.json(
          {
            error: `La sección ${sectionNum} no existe en la cartografía electoral de Jalisco. Verifica el número.`
          },
          { status: 400 }
        );
      }
    }

    // 2. Resolve or create colony in catalog if colonyName is provided
    // La colonia se registra en el municipio indicado o, si no se indicó, en el de su sección.
    const municipioColonia = municipality ?? municipioDeSeccion;
    if (colonyName && !municipioColonia) {
      return NextResponse.json({ error: "Selecciona el municipio de la colonia." }, { status: 400 });
    }

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
            municipality: municipioColonia,
            // Sin CP conocido se deja vacío: antes se ponía el de Tonalá a cualquier colonia.
            postalCode: null,
            status: "active"
          })
          .onConflictDoUpdate({
            // El índice único es (catalog_version_id, name, municipality) desde la
            // migración 0008; omitir municipality hacía fallar el INSERT siempre,
            // porque Postgres valida el ON CONFLICT al planificar, no al colisionar.
            target: [
              schema.colonies.catalogVersionId,
              schema.colonies.name,
              schema.colonies.municipality
            ],
            set: { status: "active", municipality: municipioColonia }
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
    // `colony` y `municipality` son columnas encryptedText: el propio tipo cifra
    // en toDriver. Cifrar aquí además guardaba E(E(valor)) y al leer devolvía el
    // criptograma interno en vez del nombre.
    const updateFields: Record<string, any> = {};
    if (colonyName) updateFields.colony = colonyName;
    const municipioContacto = municipality ?? municipioDeSeccion;
    if (municipioContacto) updateFields.municipality = municipioContacto;
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
