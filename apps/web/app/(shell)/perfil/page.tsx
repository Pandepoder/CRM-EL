import { getServerSession } from "@/lib/session-server";
import { requirePageRole } from "@/lib/authorization";
import LeaderProfilePage from "./[id]/page";

export default async function ProfilePage() {
  await requirePageRole();
  const session = await getServerSession();
  return <LeaderProfilePage params={Promise.resolve({ id: session.userId })} />;
}
