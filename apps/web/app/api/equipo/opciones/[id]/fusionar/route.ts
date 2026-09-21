import { NextResponse } from "next/server";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { fusionarOpciones } from "@/lib/catalogo-actividades";
import { esAdministracion } from "@/lib/permisos-incidencias";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fusiona un duplicado en otra opción. Sin `aplicar: true` solo informa cuántas actividades
 * resultarían afectadas, para que la pantalla lo muestre antes de pedir confirmación.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id } = await params;
  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }
  if (!UUID.test(id) || typeof cuerpo.destinoId !== "string" || !UUID.test(cuerpo.destinoId)) {
    return NextResponse.json({ error: "Indica una opción de origen y destino válidas." }, { status: 400 });
  }

  const esAdmin = esAdministracion(actor.roles);
  const resultado = await fusionarOpciones(
    { actorId: actor.actorId, esAdmin },
    id,
    cuerpo.destinoId,
    cuerpo.aplicar === true
  );
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.motivo }, { status: esAdmin ? 400 : 403 });
  }
  return NextResponse.json(resultado);
}
