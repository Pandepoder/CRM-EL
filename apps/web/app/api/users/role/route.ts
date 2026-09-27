import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { actorFromSession } from "@/lib/api-helpers";
import { cambiarRol } from "@/lib/gobierno-de-cuentas";
import { esUuid } from "@/lib/ids";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";

/**
 * Cambiar el rol de una cuenta. Las reglas son las de `gobierno-de-cuentas.ts` (etapa 6): el maestro,
 * sobre cualquiera menos él mismo; un administrador municipal, sobre la gente de su municipio y por
 * debajo de administración. Antes bastaba ser administración: cualquiera degradaba a otro
 * administrador, o se nombraba a sí mismo lo que quisiera (A2), sin dejar rastro (A5).
 */
export async function PATCH(req: NextRequest) {
  try {
    const actor = await actorFromSession();
    if (!actor) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    const body = (await req.json().catch(() => null)) as { userId?: unknown; roleId?: unknown } | null;
    const userId = body?.userId;
    const roleId = body?.roleId;
    if (!esUuid(userId) || !esUuid(roleId)) {
      return NextResponse.json({ message: "Datos faltantes" }, { status: 400 });
    }

    const resultado = await cambiarRol(actor, await resolveUserNetworkScope(actor.actorId), userId, roleId);
    if (!resultado.ok) return NextResponse.json({ message: resultado.error }, { status: resultado.status });
    return NextResponse.json({ success: true });
  } catch (err) {
    registrarError("Error en /api/users/role", err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
