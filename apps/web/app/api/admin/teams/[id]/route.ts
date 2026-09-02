import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { count, eq } from "drizzle-orm";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

async function assertCanManageTeam(session: { isLoggedIn: boolean; userId: string }, teamId: string) {
  if (!session.isLoggedIn) {
    return { ok: false as const, status: 401 };
  }

  const scope = await resolveUserNetworkScope(session.userId);
  if (scope.isGlobal) {
    return { ok: true as const, scope };
  }

  const db = getDatabaseClient();
  const existing = await db.query.teams.findFirst({ where: eq(schema.teams.id, teamId) });
  if (!existing || existing.leaderId !== session.userId) {
    return { ok: false as const, status: 403 };
  }

  return { ok: true as const, scope };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  const { id } = await params;
  const authz = await assertCanManageTeam(session, id);
  if (!authz.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: authz.status });
  }

  try {
    const { name, leaderId, zone, municipality, section } = await request.json();

    const db = getDatabaseClient();
    await db.update(schema.teams)
      .set({
        name: name !== undefined ? name : undefined,
        // Only a global admin can reassign leadership of a team to someone else.
        leaderId: leaderId !== undefined && authz.scope.isGlobal ? leaderId : undefined,
        zone: zone !== undefined ? (zone || null) : undefined,
        municipality: municipality !== undefined ? (municipality || null) : undefined,
        section: section !== undefined ? (section || null) : undefined
      })
      .where(eq(schema.teams.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update team:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  const { id } = await params;
  const authz = await assertCanManageTeam(session, id);
  if (!authz.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: authz.status });
  }

  try {
    const db = getDatabaseClient();

    // Las incidencias apuntan al equipo por clave foránea, así que borrarlo con
    // trabajo asignado fallaría en la base con un 500 opaco. Se comprueba antes
    // para decir qué pasa y cuántas incidencias hay que reasignar primero.
    const filas = await db
      .select({ pendientes: count() })
      .from(schema.eventReports)
      .where(eq(schema.eventReports.assignedTeamId, id));
    const pendientes = filas[0]?.pendientes ?? 0;

    if (pendientes > 0) {
      return NextResponse.json(
        {
          error: `Este equipo tiene ${pendientes} incidencia${pendientes === 1 ? "" : "s"} asignada${pendientes === 1 ? "" : "s"}. Reasígnalas a otro equipo antes de eliminarlo.`,
          assignedIncidents: pendientes
        },
        { status: 409 }
      );
    }

    await db.transaction(async (tx) => {
      await tx.delete(schema.teamMembers).where(eq(schema.teamMembers.teamId, id));
      await tx.delete(schema.teams).where(eq(schema.teams.id, id));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete team:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
