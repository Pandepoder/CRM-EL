import { NextResponse } from "next/server";

import { requireActorRoles } from "@/lib/authorization";
import { nombrar } from "@/lib/estructura-electoral-servicio";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";

export const dynamic = "force-dynamic";

/**
 * `POST`: nombrar a alguien en una sección (plan de auditoría de menús, F4.2). La lógica vive en
 * `lib/estructura-electoral-servicio.ts`: rol del catálogo, sección del municipio de quien nombra (salvo el
 * maestro), una cuenta de su mando o un ciudadano que ve (D4), casilla opcional si es RC (D5), duplicado → 409,
 * y todo en la auditoría (`electoral.assign`).
 */
export async function POST(request: Request) {
  // La guarda vuelve a leer rol y estado en la base (no confía en el rol de la cookie).
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
    const r = await nombrar(actor, await resolveUserNetworkScope(actor.actorId), {
      seccionId: cuerpo.sectionId,
      rol: cuerpo.role,
      userId: cuerpo.userId,
      contactId: cuerpo.contactId,
      casilla: cuerpo.casilla
    });
    if (!r.ok) return NextResponse.json({ error: r.error, ...(r.campo ? { campo: r.campo } : {}) }, { status: r.status });
    return NextResponse.json({ success: true, item: { id: r.nombramiento.id } }, { status: 201 });
  } catch (error) {
    registrarError("Error en POST /api/electoral/representatives", error);
    return NextResponse.json({ error: "No se pudo nombrar. Vuelve a intentarlo en un momento." }, { status: 500 });
  }
}
