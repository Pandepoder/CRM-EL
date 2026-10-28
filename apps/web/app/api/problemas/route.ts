import { NextResponse } from "next/server";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { crearReporte, misReportes, reportesParaRevisar } from "@/lib/problemas-servicio";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { registrarError } from "@/lib/registro";

export const dynamic = "force-dynamic";

/**
 * «Reportar un problema» (§9 del plan de experiencia sencilla).
 *
 * POST: cualquier persona del panel reporta algo de una pantalla o función que puede usar. Lleva un tope por
 * persona: es fácil de mandar a propósito, y no debe poder llenar la bandeja de administración.
 * GET: sin parámetros, los reportes propios con su estado y respuesta; con `?vista=revisar`, los que revisa
 * administración (403 a cualquier otro rol).
 */
const TOPE_POR_HORA = 30;

export async function POST(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();
  const limite = checkRateLimit(`problemas:${actor.actorId}`, TOPE_POR_HORA, 60 * 60 * 1000);
  if (!limite.allowed) return rateLimitResponse(limite);

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }
  try {
    const r = await crearReporte(actor, await resolveUserNetworkScope(actor.actorId), cuerpo);
    if (!r.ok) return NextResponse.json({ error: r.error, code: r.code, campo: r.campo }, { status: r.status });
    return NextResponse.json({ id: r.id, repetido: r.repetido }, { status: r.repetido ? 200 : 201 });
  } catch (error) {
    registrarError("Reportar un problema", error);
    return NextResponse.json({ error: "No se pudo guardar el reporte. Vuelve a intentarlo." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();
  const vista = new URL(req.url).searchParams.get("vista");
  try {
    if (vista === "revisar") {
      const r = await reportesParaRevisar(await resolveUserNetworkScope(actor.actorId));
      if (!r.ok) return NextResponse.json({ error: r.error, code: r.code }, { status: r.status });
      return NextResponse.json({ reportes: r.reportes, resumen: r.resumen }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ reportes: await misReportes(actor.actorId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    registrarError("Reportes de problemas", error);
    return NextResponse.json({ error: "No se pudieron leer los reportes." }, { status: 500 });
  }
}
