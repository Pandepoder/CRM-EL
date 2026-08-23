import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

import { requirePageRole } from "@/lib/authorization";

export default async function ProfilePage() {
  await requirePageRole();
  const session = await getServerSession();

  const db = getDatabaseClient();
  const results = await db
    .select({
      user: schema.userProfiles,
      role: schema.roles
    })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(eq(schema.userProfiles.id, session.userId));

  const user = results[0]?.user;
  const role = results[0]?.role;

  if (!user) return <div>Usuario no encontrado</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="mb-6 border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight">Mi Perfil</h1>
        <p className="text-gray-500 mt-1">Administra tu identidad y credenciales en el sistema.</p>
      </div>
      <ProfileClient 
        user={{ email: user.email, displayName: user.displayName }} 
        role={role ? { key: role.key, name: role.name } : null} 
      />
    </div>
  );
}
