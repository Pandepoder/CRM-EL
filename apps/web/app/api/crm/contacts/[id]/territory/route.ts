import { DevelopmentLogger } from "@tonala/shared/observability";
import { linkContactToColony } from "@tonala/modules/territory/application";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { createTerritoryMutationsDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { processOutboxInline } from "@/lib/outbox";
import { exigirAccesoAContacto } from "@/lib/permisos-contacto";
import { permissionChecker, resultToResponse } from "@/lib/api-helpers";
import { Permission, requireActorPermission } from "@/lib/authorization";
import { buscarMunicipio } from "@/lib/municipios-jalisco";
import { registrarError } from "@/lib/registro";
import { safeErrorMessage } from "@/lib/safe-error";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Corregir el domicilio lo hace quien ya ve al ciudadano: el error de captura se descubre en
  // la puerta, no en la oficina. Antes era solo de administración y un domicilio mal escrito se
  // quedaba así, con el ciudadano contado en la sección equivocada. El acceso al ciudadano se
  // comprueba enseguida, así que nadie toca una ficha que no le corresponde.
  const actor = await requireActorPermission(Permission.TerritoryLink);
  if (actor instanceof NextResponse) return actor;

  const { id } = await params;

  const vetado = await exigirAccesoAContacto(id, actor.actorId, actor.roles);
  if (vetado) return vetado;
  let body: {
    colonyId?: string;
    colonyName?: string;
    municipality?: string;
    sectionNum?: number | string;
    /** Calle y número. `""` o `null` lo borra. */
    address?: unknown;
    /** El punto exacto del domicilio (mapa o GPS), tal cual se marcó. `null` en los dos lo quita. */
    exactLatitude?: unknown;
    exactLongitude?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }

  // El punto marcado se guarda exacto, sin redondear ni moverlo a la sección: es el que usa el mapa para
  // llevar a alguien a la puerta. Antes esta ruta no lo aceptaba y el diálogo lo tiraba al guardar.
  let punto: { lat: number | null; lng: number | null } | undefined;
  if (body.exactLatitude !== undefined || body.exactLongitude !== undefined) {
    const lat = body.exactLatitude;
    const lng = body.exactLongitude;
    if (lat === null && lng === null) {
      punto = { lat: null, lng: null };
    } else if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      punto = { lat, lng };
    } else {
      return NextResponse.json({ error: "La ubicación marcada no es válida. Vuelve a marcarla en el mapa." }, { status: 400 });
    }
  }
  let calle: string | null | undefined;
  if (body.address !== undefined) {
    if (body.address !== null && typeof body.address !== "string") {
      return NextResponse.json({ error: "La calle no es válida." }, { status: 400 });
    }
    calle = body.address?.trim() || null;
    if (calle && calle.length > 300) return NextResponse.json({ error: "La calle puede tener hasta 300 caracteres." }, { status: 400 });
  }

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

    // La sección decide el municipio. Uno escrito distinto dejaba al ciudadano con el municipio de un
    // lado y la sección —y la llave de municipio, que sale de la sección— del otro. Es el mismo
    // criterio del alta (`resolverSeccionYMunicipio`).
    if (municipality && municipioDeSeccion && municipality !== municipioDeSeccion) {
      return NextResponse.json(
        { error: `La sección ${sectionNum} es de ${municipioDeSeccion}, no de ${municipality}. Corrige el municipio o la sección.` },
        { status: 400 }
      );
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
    if (calle !== undefined) updateFields.address = calle;
    if (punto) {
      updateFields.exactLatitude = punto.lat;
      updateFields.exactLongitude = punto.lng;
    }

    if (Object.keys(updateFields).length > 0) {
      await db.transaction(async (tx) => {
        const [antes] = await tx
          .select({ address: schema.contacts.address, lat: schema.contacts.exactLatitude, lng: schema.contacts.exactLongitude })
          .from(schema.contacts)
          .where(eq(schema.contacts.id, id));
        await tx.update(schema.contacts).set(updateFields).where(eq(schema.contacts.id, id));
        // La calle y el punto quedan en la auditoría como la corrección de datos (`editar-ciudadano.ts`):
        // se dice qué cambió, sin escribir en claro lo que en la ficha va cifrado.
        const cambio: Record<string, string> = {};
        const previo: Record<string, string> = {};
        if (calle !== undefined && (antes?.address ?? null) !== calle) {
          previo.address = antes?.address ? "(cifrado)" : "(vacía)";
          cambio.address = calle ? "(cifrado)" : "(vacía)";
        }
        if (punto && (antes?.lat !== punto.lat || antes?.lng !== punto.lng)) {
          previo.ubicacion = antes?.lat !== null && antes?.lat !== undefined ? "punto marcado" : "sin punto";
          cambio.ubicacion = punto.lat !== null ? "punto marcado" : "sin punto";
        }
        if (Object.keys(cambio).length > 0) {
          await tx.insert(schema.auditLogs).values({
            actorUserId: actor.actorId,
            action: "contacts.update",
            entityType: "contact",
            entityId: id,
            correlationId: actor.correlationId,
            beforeData: previo,
            afterData: cambio
          });
        }
      });
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
  } catch (err: unknown) {
    registrarError("Error updating contact territory", err);
    // Antes se respondía `err.message`: ante un fallo de la base, la consulta SQL y sus valores.
    return NextResponse.json({ error: safeErrorMessage(err, "No se pudo actualizar el domicilio.") }, { status: 500 });
  }
}
