import { NextResponse } from "next/server";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { leerFiltrosDePeticiones } from "@/lib/escucha-social";
import { crearPeticion, listarPeticiones, peticionesDelVecino } from "@/lib/escucha-social-servicio";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";
import { safeErrorMessage } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

/**
 * Escucha Social (plan de auditoría de menús, fase 3). La lógica vive en `lib/escucha-social-servicio.ts`.
 *
 * - `GET ?contacto=<id>`: «Lo que ha pedido» en la ficha de ese vecino (D10); 404 si no se le puede ver.
 * - `GET` (con `vista`, `estado`, `mias`, `page`): la primera página de la lista. El buscador va por
 *   `POST /api/escucha-social/consulta`, para que su texto no quede en la dirección.
 * - `POST`: anotar una petición; con la misma `clientRequestId` se guarda una sola vez.
 */
export async function GET(req: Request) {
  // De la base, no de la cookie: con una cuenta dada de baja esto respondía 200 con una lista vacía.
  const actor = await actorFromSession();
  if (!actor) return unauthorized();
  try {
    const alcance = await resolveUserNetworkScope(actor.actorId);
    const parametros = Object.fromEntries(new URL(req.url).searchParams);
    if (parametros.contacto !== undefined) {
      const peticiones = await peticionesDelVecino(alcance, parametros.contacto);
      if (!peticiones) return NextResponse.json({ error: "Este ciudadano no pertenece a tu brigada." }, { status: 404 });
      return NextResponse.json({ peticiones });
    }
    return NextResponse.json(await listarPeticiones(alcance, { ...leerFiltrosDePeticiones(parametros), q: "" }));
  } catch (error: unknown) {
    registrarError("Error in GET /api/escucha-social", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al obtener registros.") }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // `actorFromSession` vuelve a comprobar en la base que la cuenta siga activa.
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

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
    const r = await crearPeticion(actor, alcance, {
      titulo: cuerpo.title,
      descripcion: cuerpo.description,
      categorias: cuerpo.categories,
      contactoId: cuerpo.contactId,
      lugar: cuerpo.locationText,
      latitud: cuerpo.latitude,
      longitud: cuerpo.longitude,
      fotos: cuerpo.photoUrls,
      clientRequestId: cuerpo.clientRequestId
    });
    if (!r.ok) return NextResponse.json({ error: r.error, ...(r.campo ? { campo: r.campo } : {}) }, { status: r.status });
    return NextResponse.json({ success: true, item: r.peticion, repetida: r.repetida }, { status: r.repetida ? 200 : 201 });
  } catch (error: unknown) {
    registrarError("Error in POST /api/escucha-social", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al registrar la petición.") }, { status: 500 });
  }
}
