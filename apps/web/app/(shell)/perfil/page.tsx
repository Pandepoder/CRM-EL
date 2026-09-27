import { getServerSession } from "@/lib/session-server";
import { requirePageAccess } from "@/lib/authorization";
import LeaderProfilePage from "./[id]/page";

export default async function ProfilePage() {
  // El perfil propio lo ve cualquier rol: no hay lista de roles que comprobar,
  // solo que haya sesión.
  await requirePageAccess("/perfil");
  const session = await getServerSession();
  return <LeaderProfilePage params={Promise.resolve({ id: session.userId })} />;
}
