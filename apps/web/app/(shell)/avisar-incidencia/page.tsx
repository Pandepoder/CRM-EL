import { requirePageAccess } from "@/lib/authorization";
import { misAvisos } from "@/lib/avisos-de-campo-servicio";
import { getServerSession } from "@/lib/session-server";

import AvisarIncidenciaClient from "./AvisarIncidenciaClient";

export const dynamic = "force-dynamic";

/**
 * «Avisar de una incidencia» (plan de auditoría de menús, D9): capturistas y brigadistas avisan de un bache,
 * una fuga o una luminaria. El aviso le llega a quien manda sobre ellos para que lo acepte. Abajo, «Mis
 * avisos» dice en qué va cada uno, como «Mis reportes» en «Reportar un problema».
 */
export default async function AvisarIncidenciaPage() {
  await requirePageAccess("/avisar-incidencia");
  const session = await getServerSession();
  return <AvisarIncidenciaClient avisos={await misAvisos(session.userId)} usuarioId={session.userId} />;
}
