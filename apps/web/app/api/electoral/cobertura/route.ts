import { NextResponse } from "next/server";

import { requireActorRoles } from "@/lib/authorization";
import { leerFiltrosDeCobertura } from "@/lib/estructura-electoral";
import { coberturaPorSeccion, municipioDeCobertura } from "@/lib/estructura-electoral-servicio";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";

export const dynamic = "force-dynamic";

/**
 * La cobertura de Estructura Electoral con sus filtros (plan de auditoría de menús, F4.1). `POST` a propósito:
 * el buscador (sección, colonia o nombre de quien cubre) va en el cuerpo, no en la dirección (§5.3). El
 * municipio lo elige solo el maestro (`municipio`, por nombre); los demás ven el suyo.
 */
export async function POST(request: Request) {
  const actor = await requireActorRoles("admin", "direction", "territorial_coordinator");
  if (actor instanceof NextResponse) return actor;
  let cuerpo: Record<string, unknown>;
  try {
    const crudo: unknown = await request.json();
    if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) throw new Error("no es un objeto");
    cuerpo = crudo as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }
  try {
    const alcance = await resolveUserNetworkScope(actor.actorId);
    const municipio = await municipioDeCobertura(alcance, typeof cuerpo.municipio === "string" ? cuerpo.municipio : null);
    return NextResponse.json(await coberturaPorSeccion(alcance, municipio, leerFiltrosDeCobertura(cuerpo)));
  } catch (error) {
    registrarError("Error en POST /api/electoral/cobertura", error);
    return NextResponse.json({ error: "No se pudo leer la cobertura. Vuelve a intentarlo." }, { status: 500 });
  }
}
