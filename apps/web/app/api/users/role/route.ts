import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { changeUserRole } from "@tonala/modules/governance/application";
import { actorFromSession, permissionChecker } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest) {
  try {
    const actor = await actorFromSession();
    if (!actor) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { userId, roleId } = body;

    if (!userId || !roleId) {
      return NextResponse.json({ message: "Datos faltantes" }, { status: 400 });
    }

    const db = getDatabaseClient();
    const result = await changeUserRole(
      actor,
      { userId, roleId },
      { db, permissionChecker }
    );

    if (!result.ok) {
      return NextResponse.json({ message: result.error.publicMessage || "Error al cambiar rol" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
