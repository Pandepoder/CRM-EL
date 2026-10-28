import { eq } from "drizzle-orm";

import { schema } from "@tonala/shared/database";
import { puedeAbrir } from "@tonala/ui";

import { getDatabaseClient } from "@/lib/db-client";
import { consultarDirectorio } from "@/lib/directorio-consulta";
import { leerFiltrosDelDirectorio } from "@/lib/directorio-filtros";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { asegurarEnlacePersonal } from "@/lib/personal-slug";
import { getServerSession } from "@/lib/session-server";

import DirectorioClient from "./DirectorioClient";

/**
 * El Directorio: la primera página llega de aquí, con los filtros de la dirección; las siguientes y el buscador,
 * de `POST /api/directorio/consulta`, para que el texto buscado no quede en la dirección web. Un enlace viejo con
 * `?q=` todavía funciona: se busca, y la pantalla quita el texto de la dirección. Ver `lib/directorio-consulta.ts`.
 */
export default async function ContactsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession();
  const filtros = leerFiltrosDelDirectorio(await searchParams);

  const db = getDatabaseClient();
  const [usuario] = await db
    .select({ id: schema.userProfiles.id, displayName: schema.userProfiles.displayName, personalSlug: schema.userProfiles.personalSlug })
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.id, session.userId))
    .limit(1);

  const alcance = await resolveUserNetworkScope(session.userId);
  const inicial = await consultarDirectorio(alcance, filtros);

  return (
    <DirectorioClient
      inicial={inicial}
      filtrosIniciales={filtros}
      userSlug={(usuario ? await asegurarEnlacePersonal(usuario.id, usuario.displayName, usuario.personalSlug) : null) || ""}
      userName={usuario?.displayName || "Mi Usuario"}
      userAccessType={alcance.isAdmin ? "coordinacion" : alcance.isLeader ? "enlace" : "conexion"}
      puedeRegistrar={puedeAbrir("/crm/nuevo", alcance.roleKey)}
    />
  );
}
