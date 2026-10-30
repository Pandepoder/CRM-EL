import { NextResponse } from "next/server";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { fijarMetaDelLider } from "@/lib/meta-del-lider";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Pone o quita la meta del día de una persona (0026). Cuerpo: `{ "meta": 12 }`, o `{ "meta": null }` para
 * que vuelva a elegir su ritmo. Solo quien tiene a la persona bajo su mando: ver `lib/meta-del-lider.ts`.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Esa persona no existe." }, { status: 404 });
  let cuerpo: { meta?: unknown };
  try {
    cuerpo = (await req.json()) as { meta?: unknown };
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }
  if (!("meta" in cuerpo)) return NextResponse.json({ error: "Falta la meta." }, { status: 400 });

  try {
    const alcance = await resolveUserNetworkScope(actor.actorId);
    const resultado = await fijarMetaDelLider(actor, alcance, id, cuerpo.meta);
    if (!resultado.ok) return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    return NextResponse.json({ meta: resultado.meta });
  } catch (error) {
    registrarError("Meta del líder", error);
    return NextResponse.json({ error: "No se pudo guardar la meta. Vuelve a intentarlo." }, { status: 500 });
  }
}
