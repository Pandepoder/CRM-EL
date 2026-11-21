import { NextResponse } from "next/server";
import { z } from "zod";

import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";

import { actorFromSession, permissionChecker } from "@/lib/api-helpers";
import { COLUMNAS, type CampoImportable } from "@/lib/importar-ciudadanos";
import { contextoDeImportacion, type ContextoDeImportacion } from "@/lib/importar-ciudadanos-servicio";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

/**
 * Lo común a las rutas de `/api/crm/contacts/importar`: la sesión, el permiso y la forma del cuerpo. La lógica
 * está en `importar-ciudadanos-servicio.ts`.
 */

/** Sesión (401) y solo administración (403); después, el cuerpo. */
export async function abrirImportacion(): Promise<{ actor: ActorContext; contexto: ContextoDeImportacion } | NextResponse> {
  const actor = await actorFromSession();
  if (!actor) return NextResponse.json({ code: "unauthorized", message: "Inicia sesión para continuar." }, { status: 401 });
  if (!requirePermission(actor, Permission.ContactsCreate, permissionChecker).ok) {
    return NextResponse.json({ code: "forbidden", message: "Solo administración puede importar ciudadanos." }, { status: 403 });
  }
  const abierto = await contextoDeImportacion(await resolveUserNetworkScope(actor.actorId));
  if (!abierto.ok) return NextResponse.json({ code: "forbidden", message: abierto.message }, { status: abierto.status });
  return { actor, contexto: abierto.contexto };
}

export async function leerCuerpo<T extends z.ZodTypeAny>(request: Request, esquema: T): Promise<{ ok: true; datos: z.infer<T> } | { ok: false; respuesta: NextResponse }> {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return { ok: false, respuesta: NextResponse.json({ code: "json_invalido", message: "El cuerpo de la petición no es JSON válido." }, { status: 400 }) };
  }
  const r = esquema.safeParse(cuerpo);
  if (!r.success) {
    return { ok: false, respuesta: NextResponse.json({ code: "datos_invalidos", message: "Los datos del archivo no llegaron bien. Vuelve a elegir el archivo." }, { status: 400 }) };
  }
  return { ok: true, datos: r.data };
}

const texto = z.string().max(300).optional();
const esquemaDatos = z.object(Object.fromEntries(COLUMNAS.map((c) => [c.campo, texto])) as Record<CampoImportable, typeof texto>);

export const esquemaRenglon = z.object({
  renglon: z.number().int().min(1).max(1_048_576),
  datos: esquemaDatos
});

export const esquemaOpciones = {
  municipio: z.string().max(100).nullish(),
  responsableId: z.string().max(40).nullish()
};
