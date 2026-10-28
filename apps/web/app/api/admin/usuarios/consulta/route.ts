import { NextResponse } from "next/server";

import { puedeAbrir, rolesDeAcceso } from "@tonala/ui";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";
import { consultarUsuarios } from "@/lib/usuarios-consulta";
import { leerFiltrosDeUsuarios } from "@/lib/usuarios-filtros";

export const dynamic = "force-dynamic";

/**
 * Una página de «Usuarios y permisos» con sus filtros.
 *
 * Es `POST` a propósito: el texto del buscador (un nombre, un correo) va en el cuerpo y no en la dirección, que
 * queda en el historial del navegador y en los registros del servidor (observación O2 del plan de auditoría de
 * menús). Entra quien abre la pantalla (`ACCESO_A_PANTALLAS`); qué cuentas ve lo decide su alcance.
 */
export async function POST(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const alcance = await resolveUserNetworkScope(actor.actorId);
  const roles = rolesDeAcceso(alcance.roleKey, alcance.isMaster);
  if (!roles.some((r) => puedeAbrir("/admin-usuarios", r))) {
    return NextResponse.json({ error: "«Usuarios y permisos» es de la administración." }, { status: 403 });
  }

  let cuerpo: Record<string, unknown>;
  try {
    const crudo: unknown = await req.json();
    if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) throw new Error("no es un objeto");
    cuerpo = crudo as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }

  try {
    return NextResponse.json(await consultarUsuarios(alcance, leerFiltrosDeUsuarios(cuerpo)), {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    registrarError("Error en POST /api/admin/usuarios/consulta", error);
    return NextResponse.json({ error: "No se pudieron leer las cuentas. Vuelve a intentarlo." }, { status: 500 });
  }
}
