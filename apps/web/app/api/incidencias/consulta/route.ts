import { NextResponse } from "next/server";

import { puedeAbrir, rolesDeAcceso } from "@tonala/ui";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { consultarIncidencias } from "@/lib/incidencias-consulta";
import { leerFiltrosDeIncidencias } from "@/lib/incidencias-filtros";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";

export const dynamic = "force-dynamic";

/**
 * Las incidencias de la pantalla de Incidencias con sus filtros (plan de auditoría de menús, fase 2).
 *
 * Es `POST` a propósito: el texto del buscador va en el cuerpo y no en la dirección, que queda en el historial
 * del navegador y en los registros del servidor (§5.3 del plan). Entra quien abre la pantalla
 * (`ACCESO_A_PANTALLAS`); lo que ve dentro lo acota su alcance, y los nombres llegan ya recortados.
 */
export async function POST(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const alcance = await resolveUserNetworkScope(actor.actorId);
  const roles = rolesDeAcceso(alcance.roleKey, alcance.isMaster);
  if (!roles.some((r) => puedeAbrir("/admin-incidencias", r))) {
    return NextResponse.json({ error: "Incidencias es de quien coordina." }, { status: 403 });
  }

  let cuerpo: Record<string, unknown>;
  try {
    const crudo: unknown = await req.json();
    if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) throw new Error("no es un objeto");
    cuerpo = crudo as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }

  try {
    return NextResponse.json(await consultarIncidencias(alcance, leerFiltrosDeIncidencias(cuerpo)));
  } catch (error) {
    registrarError("Error en POST /api/incidencias/consulta", error);
    return NextResponse.json({ error: "No se pudieron leer las incidencias. Vuelve a intentarlo." }, { status: 500 });
  }
}
