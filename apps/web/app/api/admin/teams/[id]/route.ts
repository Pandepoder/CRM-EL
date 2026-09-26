import { NextResponse } from "next/server";
import { actorFromSession } from "@/lib/api-helpers";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { count, eq } from "drizzle-orm";
import { resolveUserNetworkScope, type UserNetworkScope } from "@/lib/network-hierarchy";
import { puedeBorrarEquipo, puedeCambiarLider, puedeEditarEquipo, puedeSerLider } from "@/lib/permisos-equipos";
import { municipioParaUnAdministrador } from "@/lib/alcance-municipal";
import { cambiosDeEquipo, motivoDeRechazo, municipioCanonico } from "@/lib/validacion-equipo";
import { registrarError } from "@/lib/registro";
import { esUuid } from "@/lib/ids";

const NO_ENCONTRADO = () => NextResponse.json({ error: "El equipo no existe." }, { status: 404 });
const SIN_PERMISO = (mensaje: string) => NextResponse.json({ error: mensaje }, { status: 403 });

/**
 * La identidad sale de `actorFromSession`, que relee en la base que la cuenta siga activa; antes
 * salía de la cookie. Quién edita qué equipo lo decide `permisos-equipos.ts`.
 */
async function alcanceDeLaSesion(): Promise<UserNetworkScope | NextResponse> {
  const actor = await actorFromSession();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return resolveUserNetworkScope(actor.actorId);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const scope = await alcanceDeLaSesion();
  if (scope instanceof NextResponse) return scope;

  const { id } = await params;
  if (!esUuid(id)) return NO_ENCONTRADO();

  const db = getDatabaseClient();
  const [equipo] = await db
    .select({ id: schema.teams.id, leaderId: schema.teams.leaderId })
    .from(schema.teams)
    .where(eq(schema.teams.id, id))
    .limit(1);
  if (!equipo) return NO_ENCONTRADO();
  if (!puedeEditarEquipo(scope, id)) {
    // Si el equipo está a la vista (es integrante), se dice por qué no; si no, responde igual que
    // uno inexistente: confirmar que existe ya dice algo de la estructura de otros.
    return scope.teamIds.includes(id)
      ? SIN_PERMISO("Este equipo no está bajo tu mando: lo edita quien lo lidera o administración.")
      : NO_ENCONTRADO();
  }

  const datos = cambiosDeEquipo.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json({ error: motivoDeRechazo(datos.error) }, { status: 400 });
  }
  const { name, leaderId, zone, municipality, section } = datos.data;

  const nuevoLider = leaderId !== undefined && leaderId !== equipo.leaderId ? leaderId : null;
  const cambiaLider = nuevoLider !== null;
  if (nuevoLider !== null) {
    if (!puedeCambiarLider(scope, id)) {
      return SIN_PERMISO("Tu propio equipo no puede cambiar de líder desde aquí: quedarías sin mando sobre su estructura. Pídeselo a administración.");
    }
    if (!(await puedeSerLider(scope, nuevoLider))) {
      return SIN_PERMISO(
        scope.isMaster
          ? "Esa persona no tiene una cuenta activa."
          : scope.isAdmin
            ? "Solo puedes poner al frente a una persona activa de tu municipio."
            : "Solo puedes poner al frente a alguien de tu estructura: tú o un integrante de un equipo bajo tu mando."
      );
    }
  }

  // Sacar un equipo de un municipio es mover estructura entre municipios: del maestro (etapa 6). Un
  // administrador municipal no puede ni vaciarlo: el equipo se queda con el nombre de su municipio.
  let municipio = municipality !== undefined ? municipioCanonico(municipality) : undefined;
  if (municipality !== undefined && scope.isAdmin && !scope.isMaster) {
    const propio = await municipioParaUnAdministrador(scope, municipio);
    if (!propio.ok) return SIN_PERMISO(propio.motivo);
    municipio = propio.nombre;
  }

  const cambios = {
    ...(name !== undefined ? { name } : {}),
    ...(cambiaLider ? { leaderId: nuevoLider } : {}),
    ...(zone !== undefined ? { zone: zone ?? null } : {}),
    ...(municipio !== undefined ? { municipality: municipio } : {}),
    ...(section !== undefined ? { section: section ?? null } : {})
  };
  if (Object.keys(cambios).length === 0) return NextResponse.json({ success: true });

  try {
    await db.update(schema.teams).set(cambios).where(eq(schema.teams.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    registrarError("Failed to update team", error);
    return NextResponse.json({ error: "No se pudo guardar el equipo. Intenta de nuevo." }, { status: 500 });
  }
}

/** Borrar un equipo: solo administración (ver `permisos-equipos.ts`). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const scope = await alcanceDeLaSesion();
  if (scope instanceof NextResponse) return scope;
  if (!scope.isAdmin) return SIN_PERMISO("Solo administración puede borrar equipos.");

  const { id } = await params;
  if (!esUuid(id)) return NO_ENCONTRADO();
  // Un administrador municipal borra equipos de su municipio; uno ajeno responde como inexistente.
  if (!puedeBorrarEquipo(scope, id)) return NO_ENCONTRADO();

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

    const borrados = await db.transaction(async (tx) => {
      await tx.delete(schema.teamMembers).where(eq(schema.teamMembers.teamId, id));
      return tx.delete(schema.teams).where(eq(schema.teams.id, id)).returning({ id: schema.teams.id });
    });
    if (borrados.length === 0) return NO_ENCONTRADO();

    return NextResponse.json({ success: true });
  } catch (error) {
    registrarError("Failed to delete team", error);
    return NextResponse.json({ error: "No se pudo borrar el equipo. Intenta de nuevo." }, { status: 500 });
  }
}
