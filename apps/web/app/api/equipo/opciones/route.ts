import { NextResponse } from "next/server";

import { schema } from "@tonala/shared/database";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { esAdministracion } from "@/lib/permisos-incidencias";
import { crearOpcion, listarOpciones, type TipoOpcion } from "@/lib/catalogo-actividades";
import { getDatabaseClient } from "@/lib/db-client";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

export const dynamic = "force-dynamic";

function tipoValido(valor: unknown): valor is TipoOpcion {
  return valor === "type" || valor === "tag" || valor === "profile";
}

/**
 * Busca opciones del catálogo (tipos de actividad o etiquetas). Devuelve solo las que la
 * persona puede ver. `archivadas` y `usos` son para la pantalla de administración.
 */
export async function GET(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "type";
  if (!tipoValido(kind)) {
    return NextResponse.json({ error: "El tipo de opción debe ser «type», «tag» o «profile»." }, { status: 400 });
  }

  const alcance = await resolveUserNetworkScope(actor.actorId);
  const opciones = await listarOpciones(alcance, {
    kind,
    q: url.searchParams.get("q") ?? undefined,
    incluirArchivadas: url.searchParams.get("archivadas") === "1",
    conUsos: url.searchParams.get("usos") === "1",
    limite: Number(url.searchParams.get("limite")) || undefined
  });
  return NextResponse.json({ opciones });
}

/** Crea una opción, o devuelve la existente si ya hay una con ese nombre. */
export async function POST(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  // Crear opciones para los demás es cosa de quien coordina, no de cada integrante.
  const alcance = await resolveUserNetworkScope(actor.actorId);
  if (!alcance.isGlobal && !alcance.isLeader) {
    return NextResponse.json(
      { error: "Solo quien lidera un equipo y la administración pueden crear opciones nuevas. Pídeselo a tu líder." },
      { status: 403 }
    );
  }

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }
  if (!tipoValido(cuerpo.kind) || typeof cuerpo.name !== "string") {
    return NextResponse.json({ error: "Indica el tipo de opción y su nombre." }, { status: 400 });
  }

  const esAdmin = esAdministracion(actor.roles);
  const resultado = await crearOpcion({ actorId: actor.actorId, esAdmin }, alcance, {
    kind: cuerpo.kind,
    name: cuerpo.name,
    description: typeof cuerpo.description === "string" ? cuerpo.description : null,
    scope: cuerpo.scope === "network" ? "network" : cuerpo.scope === "organization" ? "organization" : undefined,
    incidentCategory: typeof cuerpo.incidentCategory === "string" ? cuerpo.incidentCategory : undefined
  });

  if (resultado.estado === "invalida") {
    return NextResponse.json({ error: resultado.motivo }, { status: 400 });
  }

  if (resultado.estado === "creada") {
    await getDatabaseClient().insert(schema.auditLogs).values({
      actorUserId: actor.actorId,
      action: "agenda.catalog.create",
      entityType: "activity_catalog_option",
      entityId: resultado.opcion.id,
      correlationId: actor.correlationId,
      beforeData: null,
      afterData: { kind: resultado.opcion.kind, name: resultado.opcion.name, scope: resultado.opcion.scope }
    });
  }

  return NextResponse.json(resultado, { status: resultado.estado === "creada" ? 201 : 200 });
}
