import { getDatabaseClient } from "@/lib/db-client";
import { getServerSession } from "@/lib/session-server";
import { redirect } from "next/navigation";
import { schema } from "@tonala/shared/database";
import { and, eq, or, inArray, desc, ilike, type SQL } from "drizzle-orm";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import DirectorioClient from "./DirectorioClient";

const PAGE_SIZE = 25;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getServerSession();
  if (!session.isLoggedIn || !session.userId) redirect("/login");

  const { q = "", page = "1" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const db = getDatabaseClient();

  // 1. Fetch current user profile to get slug and accessType
  const userRows = await db
    .select({
      id: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName,
      accessType: schema.userProfiles.accessType,
      personalSlug: schema.userProfiles.personalSlug
    })
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.id, session.userId))
    .limit(1);

  const currentUser = userRows[0];
  const accessType = currentUser?.accessType || "conexion";

  // 2. Resolve network scope for 3-tier visibility
  const networkScope = await resolveUserNetworkScope(session.userId, accessType);

  // 3. Query contacts with network restriction
  //
  // Las condiciones se acumulan y se aplican de una sola vez. Encadenar varios
  // `.where()` sobre una consulta `$dynamic()` no las suma: cada llamada
  // SUSTITUYE a la anterior. Aquí eso significaba que en cuanto se escribía algo
  // en el buscador, el filtro de red desaparecía y el directorio devolvía todos
  // los contactos de la base. Comprobado: un capturista con cero contactos a su
  // nombre veía 25 registros ajenos con solo teclear una letra.
  const condiciones: SQL[] = [eq(schema.contacts.status, "active")];

  if (!networkScope.isGlobal && networkScope.allowedUserIds && networkScope.allowedUserIds.length > 0) {
    condiciones.push(
      or(
        inArray(schema.contacts.createdByUserId, networkScope.allowedUserIds),
        inArray(schema.contacts.referredByUserId, networkScope.allowedUserIds),
        inArray(schema.contacts.actualContactUserId, networkScope.allowedUserIds)
      )!
    );
  }

  if (q.trim()) {
    const term = `%${q.trim()}%`;
    condiciones.push(
      or(
        ilike(schema.contacts.displayName, term),
        ilike(schema.contacts.colony, term)
      )!
    );
  }

  const query = db
    .select({
      id: schema.contacts.id,
      contactId: schema.contacts.id,
      displayName: schema.contacts.displayName,
      phone: schema.contacts.phone,
      colony: schema.contacts.colony,
      municipality: schema.contacts.municipality,
      profession: schema.contacts.profession,
      interests: schema.contacts.interests,
      origin: schema.contacts.origin,
      panMilitancy: schema.contacts.panMilitancy,
      createdAt: schema.contacts.createdAt,
      createdByUserId: schema.contacts.createdByUserId,
      sectionNum: schema.electoralSections.sectionNum
    })
    .from(schema.contacts)
    .leftJoin(schema.electoralSections, eq(schema.contacts.sectionId, schema.electoralSections.id))
    .where(and(...condiciones));

  const allFiltered = await query.orderBy(desc(schema.contacts.createdAt));
  const totalCount = allFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedContacts = allFiltered.slice(offset, offset + PAGE_SIZE);

  return (
    <DirectorioClient
      contactsList={paginatedContacts}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={currentPage}
      q={q}
      userSlug={currentUser?.personalSlug || ""}
      userName={currentUser?.displayName || "Mi Usuario"}
      userAccessType={networkScope.isGlobal ? "coordinacion" : networkScope.isLeader ? "enlace" : "conexion"}
    />
  );
}
