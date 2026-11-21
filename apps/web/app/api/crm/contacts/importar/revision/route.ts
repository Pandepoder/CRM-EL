import { NextResponse } from "next/server";
import { z } from "zod";

import { TOPE_DE_RENGLONES } from "@/lib/importar-ciudadanos";
import { abrirImportacion, esquemaOpciones, esquemaRenglon, leerCuerpo } from "@/lib/importar-ciudadanos-api";
import { revisarImportacion } from "@/lib/importar-ciudadanos-servicio";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { registrarError } from "@/lib/registro";

const esquema = z.object({ ...esquemaOpciones, renglones: z.array(esquemaRenglon).min(1).max(TOPE_DE_RENGLONES) });

/**
 * La vista previa de un Excel: qué pasaría con cada renglón, sin guardar nada. Solo administración. Compara los
 * teléfonos contra todo el padrón, así que tiene tope por hora y queda en la auditoría (solo los números).
 */
export async function POST(request: Request) {
  const abierto = await abrirImportacion();
  if (abierto instanceof NextResponse) return abierto;
  const limite = checkRateLimit(`importar-revision:${abierto.actor.actorId}`, 40, 60 * 60 * 1000);
  if (!limite.allowed) return rateLimitResponse(limite);

  const cuerpo = await leerCuerpo(request, esquema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  try {
    const r = await revisarImportacion(abierto.actor, abierto.contexto, cuerpo.datos, cuerpo.datos.renglones);
    if (!r.ok) return NextResponse.json({ code: "opciones_invalidas", message: r.message }, { status: r.status });
    return NextResponse.json({ renglones: r.renglones, resumen: r.resumen });
  } catch (error) {
    registrarError("Error in POST /api/crm/contacts/importar/revision", error);
    return NextResponse.json({ code: "internal_error", message: "No se pudo revisar el archivo. Intenta de nuevo." }, { status: 500 });
  }
}
