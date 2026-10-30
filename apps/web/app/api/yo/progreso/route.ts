import { NextResponse } from "next/server";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { progresoDe } from "@/lib/mi-progreso";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";

export const dynamic = "force-dynamic";

/**
 * «Mi día»: meta, racha e insignias de quien pregunta. No recibe ningún id: siempre es el de la sesión,
 * así que no hay forma de pedir el progreso de otra persona. Se consulta al abrir la tarjeta y después de
 * cada envío, nunca en un sondeo periódico.
 */
export async function GET() {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();
  try {
    // El rol vigente en la base, no el de la cookie: decide qué insignias le tocan. El alcance decide
    // también de qué equipo es el total de la semana (sin nombres: ver `equipoDe`).
    const alcance = await resolveUserNetworkScope(actor.actorId);
    return NextResponse.json(await progresoDe(alcance), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    registrarError("Mi progreso", error);
    return NextResponse.json({ error: "No se pudo consultar tu progreso." }, { status: 500 });
  }
}
