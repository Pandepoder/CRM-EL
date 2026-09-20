import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { and, inArray, eq } from "drizzle-orm";
import { getServerSession } from "@/lib/session-server";
import { requirePageRole } from "@/lib/authorization";
import NuevoContactoForm from "./NuevoContactoForm";

export default async function NuevoContactoPage() {
  // El alta de ciudadanos se cierra aquí y no en el layout de /crm, porque el
  // brigadista sí consulta el padrón pero no registra. Sin esta guarda entraba
  // por URL a un formulario que no le toca.
  await requirePageRole("admin", "direction", "territorial_coordinator", "capturist");
  const session = await getServerSession();

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
