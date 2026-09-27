import { NextResponse } from "next/server";
import { actorFromSession } from "@/lib/api-helpers";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq, and } from "drizzle-orm";
import { registrarError } from "@/lib/registro";
import { esUuid } from "@/lib/ids";
// Quién puede tocar los integrantes y a quién puede sumar: la misma regla que el tablero de
// /admin-equipos (`lib/integrantes-equipo.ts`).
import { motivoParaNoSumar, permisoSobreIntegrantes } from "@/lib/integrantes-equipo";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // `actorFromSession` y no la cookie: relee en la base que la cuenta siga activa. Con la cookie
  // sola, un líder dado de baja seguía quitando y añadiendo integrantes (comprobado).
  const actor = await actorFromSession();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!esUuid(id) || !esUuid(userId)) return NextResponse.json({ error: "El equipo o la persona no existen." }, { status: 404 });

  try {
    const db = getDatabaseClient();

    const permiso = await permisoSobreIntegrantes(actor.actorId, id);
    if (!permiso.ok) {
      return NextResponse.json({ error: "Solo administración o el líder de este equipo pueden modificar integrantes" }, { status: 403 });
    }
    // Un administrador municipal suma solo a personas de su municipio (etapa 6); el líder, solo a
    // personas activas que él invitó.
    const motivo = await motivoParaNoSumar(permiso, actor.actorId, userId);
    if (motivo) return NextResponse.json({ error: motivo }, { status: 403 });

    await db.insert(schema.teamMembers).values({
      teamId: id,
      userId
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const isUniqueViolation =
      error?.code === "23505" ||
      error?.cause?.code === "23505" ||
      error?.message?.includes("23505") ||
      error?.message?.includes("team_members_pk") ||
      error?.message?.includes("unique constraint");

    if (isUniqueViolation) {
      return NextResponse.json({ error: "Usuario ya es miembro de este equipo" }, { status: 400 });
    }
    registrarError("Failed to add team member", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // `actorFromSession` y no la cookie: relee en la base que la cuenta siga activa. Con la cookie
  // sola, un líder dado de baja seguía quitando y añadiendo integrantes (comprobado).
  const actor = await actorFromSession();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!esUuid(id) || !esUuid(userId)) return NextResponse.json({ error: "El equipo o la persona no existen." }, { status: 404 });

  try {
    const db = getDatabaseClient();

    const permiso = await permisoSobreIntegrantes(actor.actorId, id);
    if (!permiso.ok) {
      return NextResponse.json({ error: "Solo administración o el líder de este equipo pueden modificar integrantes" }, { status: 403 });
    }

    await db.delete(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, id), eq(schema.teamMembers.userId, userId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    registrarError("Failed to remove team member", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
