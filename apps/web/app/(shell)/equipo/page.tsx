import { schema } from "@tonala/shared/database";
import { and, eq, inArray } from "drizzle-orm";
import { Permission } from "@tonala/shared/auth";

import { requirePageRole } from "@/lib/authorization";
import { consultarBitacora, crearContexto, leerFiltros, resumenBitacora } from "@/lib/bitacora-consulta";
import type { PaginaBitacora, ResumenBitacora } from "@/lib/bitacora-tipos";
import { listarOpciones } from "@/lib/catalogo-actividades";
import { contactIdRestriction, visibleContactIds } from "@/lib/contact-visibility";
import { getDatabaseClient } from "@/lib/db-client";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { permissionsForRole } from "@/lib/permissions";
import { getServerSession } from "@/lib/session-server";

import AgendaClient from "./AgendaClient";

export const dynamic = "force-dynamic";

type Pestana = "agenda" | "prospectos" | "resumen";

export default async function EquipoMiDiaPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePageRole("admin", "direction", "territorial_coordinator", "capturist", "visit_responsible");
  const session = await getServerSession();
  const sp = await searchParams;

  const cruda = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  // `rendimiento` es el nombre que tenía la pestaña de resumen.
  const pestana: Pestana = cruda === "prospectos" ? "prospectos" : cruda === "resumen" || cruda === "rendimiento" ? "resumen" : "agenda";
  const filtros = leerFiltros(sp);

  const db = getDatabaseClient();
  const alcance = await resolveUserNetworkScope(session.userId);
  const ctx = crearContexto(alcance);

  // Personas del alcance, para asignar y filtrar. Con alcance vacío (cuenta dada de baja),
  // `inArray([])` resuelve a falso y no se ve a nadie, en lugar de caer sin filtro.
  const usuarios = await db
    .select({
      id: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName,
      email: schema.userProfiles.email,
      roleKey: schema.roles.key,
      roleName: schema.roles.name
    })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(and(eq(schema.userProfiles.status, "active"), ctx.esAdmin ? undefined : inArray(schema.userProfiles.id, alcance.teammateUserIds)))
    .orderBy(schema.userProfiles.displayName);

  let pagina: PaginaBitacora | null = null;
  let resumen: ResumenBitacora | null = null;
  let tipos: Array<{ id: string; nombre: string }> = [];
  let etiquetas: Array<{ id: string; nombre: string }> = [];
  let contactoNombre: string | null = null;

  if (pestana === "agenda") {
    // Solo la página que se ve: la entrada a la bitácora ya no carga todo el historial.
    const [pag, opcTipos, opcEtiquetas] = await Promise.all([
      consultarBitacora(ctx, filtros),
      // Con archivadas: una opción archivada sigue siendo filtro válido para lo ya registrado.
      listarOpciones(alcance, { kind: "type", incluirArchivadas: true, limite: 200 }),
      listarOpciones(alcance, { kind: "tag", incluirArchivadas: true, limite: 200 })
    ]);
    pagina = pag;
    tipos = opcTipos.map((o) => ({ id: o.id, nombre: o.archived ? `${o.name} (archivado)` : o.name }));
    etiquetas = opcEtiquetas.map((o) => ({ id: o.id, nombre: o.archived ? `${o.name} (archivada)` : o.name }));

    if (filtros.contactoId) {
      const visibles = contactIdRestriction(await visibleContactIds(alcance));
      const [c] = await db
        .select({ nombre: schema.contacts.displayName })
        .from(schema.contacts)
        .where(and(eq(schema.contacts.id, filtros.contactoId), visibles))
        .limit(1);
      contactoNombre = c?.nombre ?? null;
    }
  } else if (pestana === "resumen") {
    const equipos = await db
      .select({ leaderId: schema.teams.leaderId, name: schema.teams.name })
      .from(schema.teams)
      .where(ctx.esAdmin ? undefined : inArray(schema.teams.id, alcance.teamIds));
    resumen = await resumenBitacora(ctx, filtros, usuarios, equipos);
  }

  const rol = session.roleKey || "";
  return (
    <AgendaClient
      pestana={pestana}
      pagina={pagina}
      filtros={filtros}
      resumen={resumen}
      usuarios={usuarios.map((u) => ({ id: u.id, displayName: u.displayName }))}
      tipos={tipos}
      etiquetas={etiquetas}
      contactoNombre={contactoNombre}
      usuarioActualId={session.userId}
      puedeAsignar={ctx.puedeAsignar}
      // Mismo criterio que exige el servidor para crear actividades y opciones (lidera un equipo o es administración).
      puedeCrear={ctx.esAdmin || alcance.isLeader}
      esAdmin={ctx.esAdmin}
      puedeConvertir={permissionsForRole(rol).includes(Permission.ContactsCreate)}
    />
  );
}
