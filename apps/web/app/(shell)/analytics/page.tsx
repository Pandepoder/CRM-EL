import AnalyticsClient from "./AnalyticsClient";
import { analisisDemografico } from "@/lib/analisis-demografico";
import { requirePageAccess } from "@/lib/authorization";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { getServerSession } from "@/lib/session-server";

export default async function AnalyticsPage() {
  await requirePageAccess("/analytics");
  const session = await getServerSession();

  // Sobre lo que quien consulta puede ver (el mismo alcance que el directorio), no sobre toda la base.
  // Los números se calculan en `lib/analisis-demografico.ts`; a la pantalla solo llegan conteos.
  const analisis = await analisisDemografico(await resolveUserNetworkScope(session.userId));
  return <AnalyticsClient analisis={analisis} />;
}
