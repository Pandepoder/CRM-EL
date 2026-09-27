import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/session-server";

/**
 * Pantalla retirada (M14). Listaba las visitas asignadas a quien la abría, fuera del menú y sin
 * estilos (sus clases CSS no existían). La Agenda Operativa ya muestra las visitas junto con las
 * actividades, y filtrada por responsable enseña exactamente las de uno.
 *
 * Redirección temporal y no permanente a propósito: el destino lleva el id de quien entra, y en un
 * teléfono compartido por la brigada el navegador guardaría para siempre el de la primera persona.
 */
export default async function MisVisitasRetirada(): Promise<never> {
  const session = await getServerSession();
  redirect(session.userId ? `/equipo?responsable=${encodeURIComponent(session.userId)}` : "/equipo");
}
