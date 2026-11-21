import { NextResponse } from "next/server";
import { z } from "zod";

import { UBICACIONES_POR_ENVIO } from "@/lib/importar-ciudadanos";
import { abrirImportacion, leerCuerpo } from "@/lib/importar-ciudadanos-api";
import { ubicarPorDomicilio } from "@/lib/importar-ciudadanos-servicio";
import { registrarError } from "@/lib/registro";

const esquema = z.object({ ids: z.array(z.string().max(40)).min(1).max(UBICACIONES_POR_ENVIO) });

/**
 * Busca por su domicilio a unos pocos ciudadanos importados sin sección ni ubicación. Solo administración, y
 * solo sobre lo que importó la misma persona. Ver los límites en `ubicarPorDomicilio`.
 */
export async function POST(request: Request) {
  const abierto = await abrirImportacion();
  if (abierto instanceof NextResponse) return abierto;
  const cuerpo = await leerCuerpo(request, esquema);
  if (!cuerpo.ok) return cuerpo.respuesta;
  try {
    return NextResponse.json(await ubicarPorDomicilio(abierto.actor, cuerpo.datos.ids));
  } catch (error) {
    registrarError("Error in POST /api/crm/contacts/importar/ubicar", error);
    return NextResponse.json({ code: "internal_error", message: "No se pudo buscar el domicilio. Intenta de nuevo." }, { status: 500 });
  }
}
