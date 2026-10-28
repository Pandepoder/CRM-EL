import { NextResponse } from "next/server";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { cambiarPeticion, obtenerPeticion, turnarPeticion } from "@/lib/escucha-social-servicio";
import { esUuid } from "@/lib/ids";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";
import { safeErrorMessage } from "@/lib/safe-error";

/**
 * Una petición de Escucha Social (plan de auditoría de menús, fase 3). Lógica en `lib/escucha-social-servicio.ts`.
 *
 * - `GET`: la petición, si se ve (para abrirla desde el mapa o la ficha); si no, 404.
 * - `PATCH { status?, resolutionNotes? }`: quien la anotó o quien coordina su brigada (ver no es trabajar).
 * - `PATCH { turno: { dependencia, folio?, fecha? } | null }`: turnarla a una dependencia o quitarle el turno
 *   (D6); solo administración. `approveGestion` (la versión anterior de la pantalla): `false` quita el turno;
 *   `true` pide la dependencia.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();
  const { id } = await params;
  if (!esUuid(id)) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  const peticion = await obtenerPeticion(await resolveUserNetworkScope(actor.actorId), id);
  if (!peticion) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  return NextResponse.json({ peticion });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // `actorFromSession` vuelve a comprobar en la base que la cuenta siga activa.
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id } = await params;
  if (!esUuid(id)) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  let cuerpo: Record<string, unknown>;
  try {
    const crudo: unknown = await req.json();
    if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) throw new Error("no es un objeto");
    cuerpo = crudo as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }

  try {
    const alcance = await resolveUserNetworkScope(actor.actorId);
    // `isFormalGestion` del cuerpo se ignora a propósito: la marca solo se mueve al turnar, en manos de
    // administración y con constancia de quién y a dónde.
    const r =
      "turno" in cuerpo
        ? await turnarPeticion(actor, alcance, id, cuerpo.turno && typeof cuerpo.turno === "object" ? cuerpo.turno : null)
        : "approveGestion" in cuerpo
          ? cuerpo.approveGestion
            ? { ok: false as const, status: 400, error: "Para turnar una gestión, di a qué dependencia.", campo: "dependencia" }
            : await turnarPeticion(actor, alcance, id, null)
          : await cambiarPeticion(actor, alcance, id, { status: cuerpo.status, resolutionNotes: cuerpo.resolutionNotes });
    if (!r.ok) return NextResponse.json({ error: r.error, ...(r.campo ? { campo: r.campo } : {}) }, { status: r.status });
    return NextResponse.json({ success: true, item: r.peticion });
  } catch (error: unknown) {
    registrarError("Error in PATCH /api/escucha-social/[id]", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al actualizar registro.") }, { status: 500 });
  }
}
