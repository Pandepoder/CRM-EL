import { NextResponse } from "next/server";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { recordatoriosDe } from "@/lib/recordatorios";
import { registrarError } from "@/lib/registro";

export const dynamic = "force-dynamic";

/**
 * Recordatorios de la agenda propia: actividades vencidas y las de las próximas horas. Lo consulta
 * el panel cada pocos minutos para el contador del menú y los avisos del navegador.
 */
export async function GET() {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();
  try {
    const alcance = await resolveUserNetworkScope(actor.actorId);
    return NextResponse.json(await recordatoriosDe(alcance), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    registrarError("Recordatorios de la bitácora", error);
    return NextResponse.json({ error: "No se pudieron consultar los recordatorios." }, { status: 500 });
  }
}
