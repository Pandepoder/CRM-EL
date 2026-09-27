import { NextResponse } from "next/server";
import { actorFromSession } from "@/lib/api-helpers";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq, and, or } from "drizzle-orm";
import { resolveUserNetworkScope, type UserNetworkScope } from "@/lib/network-hierarchy";
import { registrarError } from "@/lib/registro";
import { esUuid } from "@/lib/ids";
import { puedeEditarEquipo } from "@/lib/permisos-equipos";

/**
 * ¿Puede esta sesión tocar los integrantes del equipo? Administración sobre los equipos que gobierna
 * (el maestro, todos; un administrador municipal, los de su municipio), o el líder de ese mismo
 * equipo (misma regla que las acciones de /admin-equipos).
 */
async function permisoSobreIntegrantes(
  userId: string,
  teamId: string
): Promise<{ ok: boolean; esAdmin: boolean; scope: UserNetworkScope }> {
  const scope = await resolveUserNetworkScope(userId);
  if (scope.isAdmin) return { ok: puedeEditarEquipo(scope, teamId), esAdmin: true, scope };
  const db = getDatabaseClient();
  const equipo = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
  return { ok: Boolean(equipo && equipo.leaderId === userId), esAdmin: false, scope };
}

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
    // Un administrador municipal suma solo a personas activas de su municipio (etapa 6).
    if (permiso.esAdmin && !permiso.scope.isMaster && !(permiso.scope.allowedUserIds ?? []).includes(userId)) {
      return NextResponse.json({ error: "Solo puedes sumar a personas activas de tu municipio." }, { status: 403 });
    }
    // El líder solo suma a personas activas que él invitó; ver addMemberAction.
    if (!permiso.esAdmin) {
      const persona = await db.query.userProfiles.findFirst({
        where: and(
          eq(schema.userProfiles.id, userId),
          eq(schema.userProfiles.status, "active"),
          or(eq(schema.userProfiles.invitedByUserId, actor.actorId), eq(schema.userProfiles.parentEnlaceId, actor.actorId))
        )
      });
      if (!persona) return NextResponse.json({ error: "Solo puedes agregar a personas activas que tú invitaste" }, { status: 403 });
    }

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
