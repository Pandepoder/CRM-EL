import { NextResponse } from "next/server";

import { schema } from "@tonala/shared/database";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { editarOpcion, type CambiosOpcion } from "@/lib/catalogo-actividades";
import { getDatabaseClient } from "@/lib/db-client";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { esAdministracion } from "@/lib/permisos-incidencias";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ESTADO_HTTP = { no_encontrada: 404, prohibido: 403, invalida: 400, duplicada: 409 } as const;

/** Renombrar, ordenar, cambiar descripción/categoría, archivar o restaurar una opción. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "La opción no existe." }, { status: 404 });
  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }

  const cambios: CambiosOpcion = {
    name: typeof cuerpo.name === "string" ? cuerpo.name : undefined,
    description: cuerpo.description === null || typeof cuerpo.description === "string" ? cuerpo.description : undefined,
    color: cuerpo.color === null || typeof cuerpo.color === "string" ? cuerpo.color : undefined,
    icon: cuerpo.icon === null || typeof cuerpo.icon === "string" ? cuerpo.icon : undefined,
    sortOrder: typeof cuerpo.sortOrder === "number" ? cuerpo.sortOrder : undefined,
    incidentCategory: typeof cuerpo.incidentCategory === "string" ? cuerpo.incidentCategory : undefined,
    archived: typeof cuerpo.archived === "boolean" ? cuerpo.archived : undefined
  };
  if (Object.values(cambios).every((v) => v === undefined)) {
    return NextResponse.json({ error: "No hay ningún cambio que aplicar." }, { status: 400 });
  }

  const alcance = await resolveUserNetworkScope(actor.actorId);
  const resultado = await editarOpcion(id, { actorId: actor.actorId, esAdmin: esAdministracion(actor.roles) }, alcance, cambios);
  if (!resultado.ok) {
    return NextResponse.json(
      { error: resultado.motivo, existente: resultado.existente },
      { status: ESTADO_HTTP[resultado.codigo] }
    );
  }

  await getDatabaseClient().insert(schema.auditLogs).values({
    actorUserId: actor.actorId,
    action: cambios.archived === undefined ? "agenda.catalog.update" : cambios.archived ? "agenda.catalog.archive" : "agenda.catalog.restore",
    entityType: "activity_catalog_option",
    entityId: id,
    correlationId: actor.correlationId,
    beforeData: null,
    afterData: { ...cambios }
  });
  return NextResponse.json({ opcion: resultado.opcion });
}
