import { requirePageAccess } from "@/lib/authorization";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { reportesParaRevisar } from "@/lib/problemas-servicio";
import { getServerSession } from "@/lib/session-server";

import ProblemasReportadosClient from "./ProblemasReportadosClient";

export const dynamic = "force-dynamic";

/**
 * «Problemas reportados»: administración revisa y contesta lo que reporta la gente de su alcance (el
 * maestro, todo). Ver `lib/problemas-servicio.ts`.
 */
export default async function ProblemasReportadosPage() {
  await requirePageAccess("/problemas-reportados");
  const session = await getServerSession();
  const alcance = await resolveUserNetworkScope(session.userId);
  const r = await reportesParaRevisar(alcance);
  return (
    <ProblemasReportadosClient
      reportes={r.ok ? r.reportes : []}
      resumen={r.ok ? r.resumen : { porEstado: { nuevo: 0, en_revision: 0, resuelto: 0, descartado: 0 }, lugaresConMas: [] }}
      esMaestro={alcance.isMaster}
    />
  );
}
