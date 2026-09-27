import { NextResponse } from "next/server";
import { actorFromSession } from "@/lib/api-helpers";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { gestionaEquipos, puedeSerLider } from "@/lib/permisos-equipos";
import { equipoNuevo, motivoDeRechazo, municipioCanonico } from "@/lib/validacion-equipo";
import { registrarError } from "@/lib/registro";
import { municipioParaUnAdministrador } from "@/lib/alcance-municipal";

/**
 * Crear un equipo. Administración, Dirección y Líder, cada quien dentro de su mando: ver
 * `permisos-equipos.ts`. Antes era solo de administración y el menú se lo ofrecía a los otros
 * dos, que recibían un 403 (C6).
 */
export async function POST(request: Request) {
  // La identidad sale de la base (cuenta activa), no de la cookie.
  const actor = await actorFromSession();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = await resolveUserNetworkScope(actor.actorId);
  if (!gestionaEquipos(scope)) {
    return NextResponse.json(
      {
        error: scope.isAdmin
          ? "Tu cuenta de administración aún no tiene municipio: el administrador maestro te lo asigna."
          : "Tu rol no gestiona equipos."
      },
      { status: 403 }
    );
  }

  const datos = equipoNuevo.safeParse(await request.json().catch(() => null));
  if (!datos.success) {
    return NextResponse.json({ error: motivoDeRechazo(datos.error) }, { status: 400 });
  }
  const { name, leaderId, zone, municipality, section } = datos.data;

  // Un administrador municipal da de alta equipos de su municipio (etapa 6); el maestro, de cualquiera.
  let municipio = municipioCanonico(municipality);
  let llave: string | null = null;
  if (scope.isAdmin && !scope.isMaster) {
    const propio = await municipioParaUnAdministrador(scope, municipio);
    if (!propio.ok) return NextResponse.json({ error: propio.motivo }, { status: 403 });
    municipio = propio.nombre;
    llave = propio.id;
  }

  if (!(await puedeSerLider(scope, leaderId))) {
    return NextResponse.json(
      {
        error: scope.isMaster
          ? "Esa persona no tiene una cuenta activa."
          : scope.isAdmin
            ? "Solo puedes poner al frente a una persona activa de tu municipio."
            : "Solo puedes poner al frente a alguien de tu estructura: tú o un integrante de un equipo bajo tu mando."
      },
      { status: 403 }
    );
  }

  try {
    const db = getDatabaseClient();
    const [team] = await db.insert(schema.teams).values({
      name,
      leaderId,
      zone: zone ?? null,
      municipality: municipio,
      ...(llave ? { municipalityId: llave } : {}),
      section: section ?? null
    }).returning({ id: schema.teams.id });

    return NextResponse.json({ success: true, id: team!.id });
  } catch (error) {
    registrarError("Failed to create team", error);
    return NextResponse.json({ error: "No se pudo crear el equipo. Intenta de nuevo." }, { status: 500 });
  }
}
