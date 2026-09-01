import { getDatabaseClient } from "@/lib/db-client";
import { getServerSession } from "@/lib/session-server";
import { redirect } from "next/navigation";
import { schema } from "@tonala/shared/database";
import { eq, or, inArray, desc, ilike } from "drizzle-orm";
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
  let query = db
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
    .where(eq(schema.contacts.status, "active"))
    .$dynamic();

  // Apply network filter:
  // If Coordinación: no restriction
  // If Enlace: allowedUserIds
  // If Conexión: [session.userId]
  if (!networkScope.isGlobal && networkScope.allowedUserIds && networkScope.allowedUserIds.length > 0) {
    query = query.where(
      or(
        inArray(schema.contacts.createdByUserId, networkScope.allowedUserIds),
        inArray(schema.contacts.referredByUserId, networkScope.allowedUserIds),
        inArray(schema.contacts.actualContactUserId, networkScope.allowedUserIds)
      )
    );
  }

  if (q.trim()) {
    const term = `%${q.trim()}%`;
    query = query.where(
      or(
        ilike(schema.contacts.displayName, term),
        ilike(schema.contacts.colony, term)
      )
    );
  }

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
