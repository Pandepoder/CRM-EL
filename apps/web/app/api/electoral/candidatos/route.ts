import { NextResponse } from "next/server";

import { requireActorRoles } from "@/lib/authorization";
import { candidatosParaNombrar } from "@/lib/estructura-electoral-servicio";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";

export const dynamic = "force-dynamic";

/**
 * A quién se puede nombrar en una sección (plan de auditoría de menús, F4.2): ciudadanos que quieren ser
 * representantes de casilla (D4), su gente y lo que se busque. Solo personas que quien nombra puede ver. `POST`
 * para que el nombre que se escribe no quede en la dirección.
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
    const r = await candidatosParaNombrar(
      await resolveUserNetworkScope(actor.actorId),
      cuerpo.sectionId,
      cuerpo.role,
      typeof cuerpo.q === "string" ? cuerpo.q : ""
    );
    if ("ok" in r) return NextResponse.json({ error: r.error, ...(r.campo ? { campo: r.campo } : {}) }, { status: r.status });
    return NextResponse.json(r);
  } catch (error) {
    registrarError("Error en POST /api/electoral/candidatos", error);
    return NextResponse.json({ error: "No se pudo leer a quién nombrar. Vuelve a intentarlo." }, { status: 500 });
  }
}
