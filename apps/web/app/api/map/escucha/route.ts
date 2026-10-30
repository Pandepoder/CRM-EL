import { NextResponse } from "next/server";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { peticionesEnMapa } from "@/lib/escucha-social-servicio";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";

export const dynamic = "force-dynamic";

/**
 * La capa «Peticiones» del mapa (plan de auditoría de menús, F3.3): las peticiones de Escucha Social que ve
 * quien pregunta y que tienen ubicación. Solo tipo, estado y punto: ni título, ni vecino, ni teléfono (§5.2).
 * Para ver una, el globo enlaza a Escucha Social.
 */
export async function GET() {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();
  try {
    return NextResponse.json({ puntos: await peticionesEnMapa(await resolveUserNetworkScope(actor.actorId)) });
  } catch (error) {
    registrarError("Error en GET /api/map/escucha", error);
    return NextResponse.json({ error: "No se pudieron leer las peticiones del mapa." }, { status: 500 });
  }
}
