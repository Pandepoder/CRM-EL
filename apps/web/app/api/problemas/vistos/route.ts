import { NextResponse } from "next/server";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { marcarRespuestasVistas } from "@/lib/problemas-servicio";
import { registrarError } from "@/lib/registro";

export const dynamic = "force-dynamic";

/**
 * Quien abrió «Mis reportes» ya vio las respuestas: se quita el número de su menú. Va aparte y por POST, y no
 * al pintar la pantalla, para que una carga anticipada del enlace del menú no las dé por vistas.
 */
export async function POST() {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();
  try {
    return NextResponse.json({ vistas: await marcarRespuestasVistas(actor.actorId) });
  } catch (error) {
    registrarError("Marcar respuestas vistas", error);
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
  }
}
