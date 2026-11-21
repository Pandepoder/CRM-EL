import { NextResponse } from "next/server";
import { z } from "zod";

import { RENGLONES_POR_TANDA } from "@/lib/importar-ciudadanos";
import { abrirImportacion, esquemaOpciones, esquemaRenglon, leerCuerpo } from "@/lib/importar-ciudadanos-api";
import { guardarTanda } from "@/lib/importar-ciudadanos-servicio";
import { registrarError } from "@/lib/registro";

const esquema = z.object({
  ...esquemaOpciones,
  importacionId: z.string().uuid(),
  renglones: z.array(esquemaRenglon.extend({ clientRequestId: z.string().uuid() })).min(1).max(RENGLONES_POR_TANDA)
});

/**
 * Guarda una tanda de un Excel ya revisado. Solo administración. Todo se vuelve a revisar aquí; cada renglón
 * trae su clave, así que reenviar la tanda tras un corte no duplica a nadie.
 */
export async function POST(request: Request) {
  const abierto = await abrirImportacion();
  if (abierto instanceof NextResponse) return abierto;
  const cuerpo = await leerCuerpo(request, esquema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  try {
    const r = await guardarTanda(abierto.actor, abierto.contexto, cuerpo.datos, cuerpo.datos.renglones);
    if (!r.ok) return NextResponse.json({ code: "opciones_invalidas", message: r.message }, { status: r.status });
    return NextResponse.json({ renglones: r.renglones, resumen: r.resumen });
  } catch (error) {
    registrarError("Error in POST /api/crm/contacts/importar", error);
    return NextResponse.json({ code: "internal_error", message: "No se pudo guardar esta parte del archivo. Intenta de nuevo." }, { status: 500 });
  }
}
