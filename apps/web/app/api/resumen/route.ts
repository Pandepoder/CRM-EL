import { NextResponse } from "next/server";

import { requireActorRoles } from "@/lib/authorization";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { kpisDelResumen } from "@/lib/resumen-kpis";

/**
 * Los números de cabecera de /resumen, los mismos que enseña la pantalla y con el mismo alcance
 * (ver `resumen-kpis.ts`). Antes esta ruta devolvía totales de todo el sistema, calculados por otro
 * módulo con otras reglas, y solo a administración: dos respuestas distintas a la misma pregunta
 * (M4). La abren los mismos roles que la pantalla.
 */
export async function GET() {
  const actor = await requireActorRoles("admin", "direction", "territorial_coordinator");
  if (actor instanceof NextResponse) return actor;

  const alcance = await resolveUserNetworkScope(actor.actorId);
  return NextResponse.json(await kpisDelResumen(alcance));
}
