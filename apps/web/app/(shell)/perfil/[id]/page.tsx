import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { schema } from "@tonala/shared/database";

import { cuentaGobernada } from "@/lib/alcance-municipal";
import { actorFromSession } from "@/lib/api-helpers";
import { registrarConsultaDelMaestro } from "@/lib/auditoria";
import { requirePageAccess } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";
import { equiposDePersona } from "@/lib/equipos-de-persona";
import { esUuid } from "@/lib/ids";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { datosDelPerfil, puedeVerPerfil } from "@/lib/perfil";
import { pestanaInicial } from "@/lib/perfil-pestanas";
import { getServerSession } from "@/lib/session-server";

import LeaderProfileClient from "./LeaderProfileClient";

export const dynamic = "force-dynamic";

/**
 * El perfil de una persona (plan de auditoría de menús, fase 6): quién es, sus equipos reales, sus últimos 20
 * ciudadanos y el total (el resto, en el Directorio con `?registro=`), sus últimas 30 actividades con el tipo real
 * de la Agenda, y en qué colonias y secciones trabaja. Ver `lib/perfil.ts`.
 */
export default async function LeaderProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Ningún rol queda fuera de esta pantalla de entrada: quién puede ver el perfil de quién se decide más abajo
  // por alcance, no por rol.
  await requirePageAccess("/perfil");
  const session = await getServerSession();
  const { id: targetUserId } = await params;
  // Un id que no es UUID no existe: sin esto la base lo rechazaba y la pantalla caía en la frontera de error
  // («algo falló») en vez de decir que no hay tal perfil. Ver `ids.ts`.
  if (!esUuid(targetUserId)) return notFound();

  const db = getDatabaseClient();
  const [targetUser] = await db
    .select({
      id: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName,
      email: schema.userProfiles.email,
      status: schema.userProfiles.status,
      photoUrl: schema.userProfiles.photoUrl,
      homeAddress: schema.userProfiles.homeAddress,
      homeColony: schema.userProfiles.homeColony,
      homeMunicipality: schema.userProfiles.homeMunicipality,
      createdAt: schema.userProfiles.createdAt,
      roleKey: schema.roles.key,
      roleName: schema.roles.name
    })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(eq(schema.userProfiles.id, targetUserId))
    .limit(1);
  if (!targetUser) return notFound();

  // La propia persona, el maestro, la administración de su municipio o alguien de su estructura: si no, el perfil
  // no existe (sus ciudadanos y actividades se filtrarían entre brigadas sin relación).
  const viewerScope = await resolveUserNetworkScope(session.userId);
  if (!(await puedeVerPerfil(viewerScope, targetUserId))) return notFound();

  // Su domicilio (0025) lo ven la propia persona y la administración que la gobierna: el maestro, o la de su
  // municipio. Sus compañeros de brigada ven su perfil, pero no dónde vive.
  let veDomicilio = session.userId === targetUserId || viewerScope.isMaster;
  if (session.userId !== targetUserId) {
    // «La que la gobierna»: la cuenta está en su municipio y no es de administración (A2).
    if (!veDomicilio && viewerScope.isAdmin) veDomicilio = (await cuentaGobernada(viewerScope, targetUserId)) !== null;
    // El maestro ve el perfil de cualquiera; cada uno que abre queda en la auditoría (etapa 6).
    const actor = await actorFromSession();
    if (actor) await registrarConsultaDelMaestro(actor, viewerScope, "user_profile", targetUserId);
  }

  // Sus equipos reales: los que dirige y de los que es integrante (auditoría de menús, A3). Lo demás, recortado a
  // lo que quien mira puede ver: entrar al perfil de alguien no amplía lo que se ve.
  const [equipos, datos] = await Promise.all([equiposDePersona(targetUserId, viewerScope), datosDelPerfil(viewerScope, targetUserId)]);

  return (
    <LeaderProfileClient
      user={{
        id: targetUser.id,
        displayName: targetUser.displayName,
        email: targetUser.email,
        status: targetUser.status,
        createdAt: (targetUser.createdAt instanceof Date ? targetUser.createdAt : new Date(targetUser.createdAt)).toISOString(),
        roleKey: targetUser.roleKey || "capturist",
        roleName: targetUser.roleName || "Operador Territorial",
        photoUrl: targetUser.photoUrl
      }}
      equipos={equipos}
      contacts={datos.ciudadanos}
      totalContactos={datos.totalCiudadanos}
      activities={datos.actividades}
      resumenActividades={datos.resumenActividades}
      topColonies={datos.colonias}
      topSections={datos.secciones}
      domicilio={veDomicilio ? { calle: targetUser.homeAddress, colonia: targetUser.homeColony, municipio: targetUser.homeMunicipality } : null}
      isCurrentUser={session.userId === targetUserId}
      pestanaInicial={pestanaInicial((await searchParams)?.pestana, session.userId === targetUserId)}
      currentUserRole={session.roleKey || ""}
    />
  );
}
