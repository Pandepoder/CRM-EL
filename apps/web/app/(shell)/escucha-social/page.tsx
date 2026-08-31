import { getDatabaseClient } from "@/lib/db-client";
import { getServerSession } from "@/lib/session-server";
import { redirect } from "next/navigation";
import { schema } from "@tonala/shared/database";
import { eq, desc, inArray } from "drizzle-orm";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import EscuchaSocialClient from "./EscuchaSocialClient";

export default async function EscuchaSocialPage() {
  const session = await getServerSession();
  if (!session.isLoggedIn || !session.userId) redirect("/login");

  const db = getDatabaseClient();

  const userRows = await db
    .select({
      id: schema.userProfiles.id,
      accessType: schema.userProfiles.accessType,
      roleKey: schema.roles.key
    })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(eq(schema.userProfiles.id, session.userId))
    .limit(1);

  const currentUser = userRows[0];
  const accessType = currentUser?.accessType || "conexion";
  const isCoordinacion = accessType === "coordinacion" || currentUser?.roleKey === "admin" || currentUser?.roleKey === "direction";

  const networkScope = await resolveUserNetworkScope(session.userId, accessType);

  let query = db
    .select({
      id: schema.socialListening.id,
      contactId: schema.socialListening.contactId,
      categories: schema.socialListening.categories,
      title: schema.socialListening.title,
      description: schema.socialListening.description,
      photoUrls: schema.socialListening.photoUrls,
      latitude: schema.socialListening.latitude,
      longitude: schema.socialListening.longitude,
      locationText: schema.socialListening.locationText,
      status: schema.socialListening.status,
      isFormalGestion: schema.socialListening.isFormalGestion,
      approvedByUserId: schema.socialListening.approvedByUserId,
      resolutionNotes: schema.socialListening.resolutionNotes,
      createdByUserId: schema.socialListening.createdByUserId,
      createdByName: schema.userProfiles.displayName,
      createdAt: schema.socialListening.createdAt
    })
    .from(schema.socialListening)
    .leftJoin(schema.userProfiles, eq(schema.socialListening.createdByUserId, schema.userProfiles.id))
    .$dynamic();

  if (!networkScope.isGlobal && networkScope.allowedUserIds && networkScope.allowedUserIds.length > 0) {
    query = query.where(inArray(schema.socialListening.createdByUserId, networkScope.allowedUserIds));
  }

  const items = await query.orderBy(desc(schema.socialListening.createdAt));

  const serialized = items.map(item => ({
    ...item,
    categories: Array.isArray(item.categories) ? item.categories as string[] : [String(item.categories)],
    photoUrls: Array.isArray(item.photoUrls) ? item.photoUrls as string[] : [],
    createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString()
  }));

  return (
    <EscuchaSocialClient
      initialItems={serialized}
      isCoordinacion={isCoordinacion}
      currentUserId={session.userId}
    />
  );
}
