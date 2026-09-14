import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { and, inArray, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session-server";
import NuevoContactoForm from "./NuevoContactoForm";

export default async function NuevoContactoPage() {
  const session = await getServerSession();
  if (!session.isLoggedIn) redirect("/login");

  const db = getDatabaseClient();
  const scope = await resolveUserNetworkScope(session.userId);

  // Fetch users for dropdowns
  const users = await db
    .select({
      id: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName,
      accessType: schema.userProfiles.accessType
    })
    .from(schema.userProfiles)
    .where(and(eq(schema.userProfiles.status, "active"), scope.isGlobal ? undefined : inArray(schema.userProfiles.id, scope.teammateUserIds)));

  const userOptions = users.map((u) => ({
    value: u.id,
    label: u.displayName,
    badge: (u.accessType || "conexion").toUpperCase()
  }));

  return (
    <NuevoContactoForm
      userOptions={userOptions}
      currentUserId={session.userId || ""}
    />
  );
}
