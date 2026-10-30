import { NextResponse } from "next/server";

import { puedeAbrir, rolesDeAcceso } from "@tonala/ui";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { consultarDirectorio } from "@/lib/directorio-consulta";
import { leerFiltrosDelDirectorio } from "@/lib/directorio-filtros";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";

export const dynamic = "force-dynamic";

/**
 * Una página del Directorio con sus filtros.
 *
 * Es `POST` a propósito: el texto del buscador (un nombre, un teléfono) va en el cuerpo y no en la dirección, que
 * queda en el historial del navegador y en los registros del servidor (observación O2 del plan de auditoría de
 * menús). Entra quien abre el Directorio (`ACCESO_A_PANTALLAS`); lo que ve lo acota su alcance.
 */
export async function POST(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const alcance = await resolveUserNetworkScope(actor.actorId);
  const roles = rolesDeAcceso(alcance.roleKey, alcance.isMaster);
  if (!roles.some((r) => puedeAbrir("/crm/contacts", r))) {
    return NextResponse.json({ error: "No puedes abrir el Directorio." }, { status: 403 });
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
    return NextResponse.json(await consultarDirectorio(alcance, leerFiltrosDelDirectorio(cuerpo)), {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    registrarError("Error en POST /api/directorio/consulta", error);
    return NextResponse.json({ error: "No se pudo leer el Directorio. Vuelve a intentarlo." }, { status: 500 });
  }
}
