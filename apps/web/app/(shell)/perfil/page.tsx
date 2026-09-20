import { getServerSession } from "@/lib/session-server";
import { requirePageSession } from "@/lib/authorization";
import LeaderProfilePage from "./[id]/page";

export default async function ProfilePage() {
  // El perfil propio lo ve cualquier rol: no hay lista de roles que comprobar,
  // solo que haya sesión.
  await requirePageSession();
  const session = await getServerSession();
  return <LeaderProfilePage params={Promise.resolve({ id: session.userId })} />;
}
