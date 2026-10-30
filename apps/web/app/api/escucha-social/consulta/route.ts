import { NextResponse } from "next/server";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { leerFiltrosDePeticiones } from "@/lib/escucha-social";
import { listarPeticiones } from "@/lib/escucha-social-servicio";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";

export const dynamic = "force-dynamic";

/**
 * La lista de Escucha Social con sus filtros (plan de auditoría de menús, F3.6). Es `POST` a propósito: el
 * texto del buscador va en el cuerpo y no en la dirección (§5.3). Escucha Social la abren todos los roles; lo que
 * ve cada quien lo acota su alcance.
 */
export async function POST(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();
  let cuerpo: Record<string, unknown>;
  try {
    const crudo: unknown = await req.json();
    if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) throw new Error("no es un objeto");
    cuerpo = crudo as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }
  try {
    return NextResponse.json(await listarPeticiones(await resolveUserNetworkScope(actor.actorId), leerFiltrosDePeticiones(cuerpo)));
  } catch (error) {
    registrarError("Error en POST /api/escucha-social/consulta", error);
    return NextResponse.json({ error: "No se pudieron leer las peticiones. Vuelve a intentarlo." }, { status: 500 });
  }
}
