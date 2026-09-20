import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq, and, or } from "drizzle-orm";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

/**
 * ¿Puede esta sesión tocar los integrantes del equipo? Administración, o el líder de ese mismo
 * equipo (misma regla que las acciones de /admin-equipos).
 */
async function permisoSobreIntegrantes(userId: string, teamId: string) {
  const scope = await resolveUserNetworkScope(userId);
  if (scope.isGlobal) return { ok: true as const, esAdmin: true };
  const db = getDatabaseClient();
  const equipo = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
  if (equipo && equipo.leaderId === userId) return { ok: true as const, esAdmin: false };
  return { ok: false as const, esAdmin: false };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const db = getDatabaseClient();

    const permiso = await permisoSobreIntegrantes(session.userId, id);
    if (!permiso.ok) {
      return NextResponse.json({ error: "Solo administración o el líder de este equipo pueden modificar integrantes" }, { status: 403 });
    }
    // El líder solo suma a personas activas que él invitó; ver addMemberAction.
    if (!permiso.esAdmin) {
      const persona = await db.query.userProfiles.findFirst({
        where: and(
          eq(schema.userProfiles.id, userId),
          eq(schema.userProfiles.status, "active"),
          or(eq(schema.userProfiles.invitedByUserId, session.userId), eq(schema.userProfiles.parentEnlaceId, session.userId))
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
    console.error("Failed to add team member:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const db = getDatabaseClient();

    const permiso = await permisoSobreIntegrantes(session.userId, id);
    if (!permiso.ok) {
      return NextResponse.json({ error: "Solo administración o el líder de este equipo pueden modificar integrantes" }, { status: 403 });
    }

    await db.delete(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, id), eq(schema.teamMembers.userId, userId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove team member:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
