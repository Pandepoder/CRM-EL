import { contactosVisibles, contactIdRestriction } from "@/lib/contact-visibility";
import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq, sql, and, inArray } from "drizzle-orm";
import TeamsClient from "./TeamsClient";
import { requirePageAccess } from "@/lib/authorization";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { gestionaEquipos, lideresPosibles, puedeBorrarEquipo, puedeCambiarLider, puedeEditarEquipo } from "@/lib/permisos-equipos";
import { condicionDeEquipos, municipioDeAdministracion, nombreDeMunicipio } from "@/lib/alcance-municipal";

export default async function AdminEquiposPage() {
  await requirePageAccess("/admin-equipos");
  const session = await getServerSession();
  const db = getDatabaseClient();
  
  const networkScope = await resolveUserNetworkScope(session.userId);
  // El municipio de un administrador municipal: sus equipos se crean ahí (etapa 6).
  const municipioPropio = municipioDeAdministracion(networkScope);
  const municipioFijo = municipioPropio ? await nombreDeMunicipio(municipioPropio) : null;

  // 1. A quién se puede poner al frente de un equipo: la misma lista que acepta la API
  // (`permisos-equipos.ts`). Antes se ofrecía a todos los compañeros, y elegir a alguien que no
  // está bajo tu mando dejaba el equipo fuera de tu vista.
  const posibles = await lideresPosibles(networkScope);
  const users = await db
    .select({
      id: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName,
      roleKey: schema.roles.key
    })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(and(eq(schema.userProfiles.status, "active"), posibles ? inArray(schema.userProfiles.id, [...posibles]) : undefined))
    .orderBy(schema.userProfiles.displayName);

  // 2. Fetch existing real teams
  // `teamIds` son los equipos donde la persona es líder o integrante y, en cascada, las brigadas
  // bajo su mando: así una dirección ve la estructura que cuelga de su coordinación. Antes la
  // lista se recortaba después a los equipos donde ella misma figuraba y esas brigadas no
  // aparecían por ningún lado.
  const existingTeams = await db
    .select({
      id: schema.teams.id,
      name: schema.teams.name,
      zone: schema.teams.zone,
      leaderId: schema.teams.leaderId,
      municipality: schema.teams.municipality,
      municipioLlave: schema.municipalities.name,
      municipioTipo: schema.municipalities.kind,
      section: schema.teams.section,
      leaderName: schema.userProfiles.displayName
    })
    .from(schema.teams)
    .innerJoin(schema.municipalities, eq(schema.municipalities.id, schema.teams.municipalityId))
    .leftJoin(schema.userProfiles, eq(schema.teams.leaderId, schema.userProfiles.id))
    .where(condicionDeEquipos(networkScope))
    .orderBy(schema.teams.name);

  // 3. Los integrantes de esos mismos equipos.
  const allTeamMembers = existingTeams.length
    ? await db
        .select({
          teamId: schema.teamMembers.teamId,
          userId: schema.teamMembers.userId
        })
        .from(schema.teamMembers)
        .where(inArray(schema.teamMembers.teamId, existingTeams.map((t) => t.id)))
    : [];

  // 4. Fetch count of registered contacts per user to aggregate by team
  const contactRestriction = contactIdRestriction(await contactosVisibles(networkScope));
  const contactCounts = await db
    .select({
      userId: schema.contacts.createdByUserId,
      count: sql<number>`count(*)::int`
    })
    .from(schema.contacts)
    .where(and(eq(schema.contacts.status, "active"), contactRestriction))
    .groupBy(schema.contacts.createdByUserId);

  const contactCountMap = new Map<string, number>();
  contactCounts.forEach(c => {
    if (c.userId) {
      contactCountMap.set(c.userId, Number(c.count));
    }
  });

  // Calculate stats for each team
  const teamsData = existingTeams.map(team => {
    const teamMembersList = allTeamMembers.filter(m => m.teamId === team.id);
    const memberIds = Array.from(new Set([team.leaderId, ...teamMembersList.map(m => m.userId)].filter(Boolean)));
    
    let totalContacts = 0;
    memberIds.forEach(mId => {
      totalContacts += (contactCountMap.get(mId) || 0);
    });

    // Solo distingue la tarjeta propia en la lista. Qué se puede hacer con cada equipo lo dice
    // `permisos-equipos.ts`, igual que en la API: editar los de tu mando, cambiar el líder solo en
    // las brigadas que cuelgan de él, y borrar, solo administración.
    const isMyTeam = team.leaderId === session.userId || teamMembersList.some(m => m.userId === session.userId);

    return {
      id: team.id,
      name: team.name,
      zone: team.zone,
      leaderId: team.leaderId,
      leaderName: team.leaderName,
      municipality: team.municipality,
      municipio: { nombre: team.municipioLlave, esGeneral: team.municipioTipo === "general" },
      section: team.section,
      membersCount: memberIds.length,
      contactsCount: totalContacts,
      isMyTeam,
      editable: puedeEditarEquipo(networkScope, team.id),
      liderEditable: puedeCambiarLider(networkScope, team.id),
      borrable: puedeBorrarEquipo(networkScope, team.id)
    };
  });

  return (
    <TeamsClient
      teams={teamsData}
      users={users}
      esAdministracion={networkScope.isAdmin}
      municipioFijo={municipioFijo}
      puedeCrear={gestionaEquipos(networkScope)}
      currentUserId={session.userId}
    />
  );
}
