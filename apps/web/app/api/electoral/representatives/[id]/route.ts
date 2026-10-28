import { NextResponse } from "next/server";

import { requireActorRoles } from "@/lib/authorization";
import { cambiarNombramiento, quitarNombramiento } from "@/lib/estructura-electoral-servicio";
import { esUuid } from "@/lib/ids";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";

export const dynamic = "force-dynamic";

/**
 * Un nombramiento (plan de auditoría de menús, F4.2). Antes solo existía `POST`: a quien ya no podía no había
 * cómo quitarlo ni cambiarle el rol.
 *
 * - `PATCH { role?, casilla? }`: cambiar el rol o la casilla (`electoral.change`).
 * - `DELETE`: quitarlo (`electoral.remove`, con a quién, de qué sección, con qué rol y quién lo hizo).
 *
 * Lo cambia la administración en su municipio; quien coordina, si la persona nombrada está bajo su mando o la
 * nombró alguien de su mando. Lo que no se ve: 404. Lo que se ve y no le toca: 403.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActorRoles("admin", "direction", "territorial_coordinator");
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  if (!esUuid(id)) return NextResponse.json({ error: "No encontramos ese nombramiento." }, { status: 404 });

  let cuerpo: Record<string, unknown>;
  try {
    const crudo: unknown = await request.json();
    if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) throw new Error("no es un objeto");
    cuerpo = crudo as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }

  try {
    const r = await cambiarNombramiento(actor, await resolveUserNetworkScope(actor.actorId), id, { rol: cuerpo.role, casilla: cuerpo.casilla });
    if (!r.ok) return NextResponse.json({ error: r.error, ...(r.campo ? { campo: r.campo } : {}) }, { status: r.status });
    return NextResponse.json({ success: true });
  } catch (error) {
    registrarError("Error en PATCH /api/electoral/representatives/[id]", error);
    return NextResponse.json({ error: "No se pudo guardar el cambio. Vuelve a intentarlo." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActorRoles("admin", "direction", "territorial_coordinator");
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  if (!esUuid(id)) return NextResponse.json({ error: "No encontramos ese nombramiento." }, { status: 404 });

  try {
    const r = await quitarNombramiento(actor, await resolveUserNetworkScope(actor.actorId), id);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ success: true });
  } catch (error) {
    registrarError("Error en DELETE /api/electoral/representatives/[id]", error);
    return NextResponse.json({ error: "No se pudo quitar. Vuelve a intentarlo." }, { status: 500 });
  }
}
