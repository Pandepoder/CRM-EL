import { requirePageAccess } from "@/lib/authorization";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { lugaresParaReportar } from "@/lib/problemas";
import { misReportes } from "@/lib/problemas-servicio";
import { getServerSession } from "@/lib/session-server";

import ReportarProblemaClient from "./ReportarProblemaClient";

export const dynamic = "force-dynamic";

/**
 * «Reportar un problema» (§9 del plan de experiencia sencilla): para cualquier persona del panel. La lista de
 * «¿Dónde pasó?» son las pantallas de su menú y las funciones que usa, nada más.
 */
export default async function ReportarProblemaPage({ searchParams }: { searchParams: Promise<{ desde?: string }> }) {
  await requirePageAccess("/reportar-problema");
  const session = await getServerSession();
  const alcance = await resolveUserNetworkScope(session.userId);
  const { desde } = await searchParams;
  return (
    <ReportarProblemaClient
      lugares={lugaresParaReportar(alcance.roleKey, alcance.isMaster)}
      desde={typeof desde === "string" ? desde.slice(0, 300) : null}
      reportes={await misReportes(session.userId)}
    />
  );
}
