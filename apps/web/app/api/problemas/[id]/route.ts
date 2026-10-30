import { NextResponse } from "next/server";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { cambiarEstadoDeReporte } from "@/lib/problemas-servicio";
import { registrarError } from "@/lib/registro";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Administración cambia el estado de un reporte de su alcance y le contesta a quien lo hizo. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Ese reporte no existe." }, { status: 404 });

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }
  try {
    const r = await cambiarEstadoDeReporte(actor, await resolveUserNetworkScope(actor.actorId), id, cuerpo);
    if (!r.ok) return NextResponse.json({ error: r.error, code: r.code, campo: r.campo }, { status: r.status });
    return NextResponse.json({ estado: r.estado, respuesta: r.respuesta });
  } catch (error) {
    registrarError("Contestar un reporte de problema", error);
    return NextResponse.json({ error: "No se pudo guardar. Vuelve a intentarlo." }, { status: 500 });
  }
}
