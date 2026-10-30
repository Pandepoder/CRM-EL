import { NextResponse } from "next/server";
import { Permission, requirePermission } from "@tonala/shared/auth";

import { actorFromSession, permissionChecker, unauthorized } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { registrarError } from "@/lib/registro";
import { avisoSiTelefonoRepetido } from "@/lib/telefono-repetido";

export const dynamic = "force-dynamic";

/**
 * ¿Ese teléfono ya está en otra ficha? Lo pregunta el alta del panel en cuanto se termina de escribir el
 * número (F15): antes se descubría al guardar, después de llenar todo.
 *
 * No dice nada que el alta no diga ya al guardar —el mismo aviso, y de quién es la ficha solo si quien
 * pregunta puede verla—, y pide el mismo permiso que el alta. Como una consulta suelta es más fácil de
 * repetir que un formulario entero, lleva un tope por persona. El registro público por QR no la usa: ahí
 * permitiría averiguar qué teléfonos están registrados sin sesión.
 *
 * El teléfono viaja en el cuerpo de un POST: en la dirección (`?telefono=`, como antes) quedaba en las
 * bitácoras del servidor y de cualquier intermediario.
 */
const TOPE_POR_HORA = 120;

export async function POST(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();
  if (!requirePermission(actor, Permission.ContactsCreate, permissionChecker).ok) {
    return NextResponse.json({ code: "forbidden", message: "Tu rol no puede dar de alta ciudadanos." }, { status: 403 });
  }
  const limite = checkRateLimit(`telefono-repetido:${actor.actorId}`, TOPE_POR_HORA, 60 * 60 * 1000);
  if (!limite.allowed) return rateLimitResponse(limite);

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const pedido = cuerpo && typeof cuerpo === "object" ? (cuerpo as { telefono?: unknown }).telefono : undefined;
  const telefono = typeof pedido === "string" ? pedido.slice(0, 20) : "";
  if (telefono.replace(/\D/g, "").length < 7) return NextResponse.json({ repetido: false });

  try {
    const alcance = await resolveUserNetworkScope(actor.actorId);
    const aviso = await avisoSiTelefonoRepetido(alcance, telefono);
    if (!aviso) return NextResponse.json({ repetido: false }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json(
      { repetido: true, message: aviso.message, contactoExistenteId: aviso.contactoExistenteId ?? null },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    registrarError("Teléfono repetido (consulta previa)", error);
    // Si la consulta falla, el alta sigue avisando al guardar: no se estorba la captura.
    return NextResponse.json({ repetido: false });
  }
}
