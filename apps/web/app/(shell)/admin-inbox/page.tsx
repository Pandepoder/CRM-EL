import { redirect } from "next/navigation";

/**
 * Pantalla retirada (plan de auditoría de menús, D2). «Todos los reportes» repetía Incidencias sin dejar
 * hacer nada y mezclaba actividades de la Agenda (A1, B3): ahora es la vista «Todas» de Incidencias. Aquí solo
 * se redirige a quien llegue por un enlace o un marcador viejo; la guarda la pone la pantalla de destino.
 */
export default async function TodosLosReportesRetirado({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const pagina = Number.parseInt(page ?? "", 10);
  redirect(`/admin-incidencias?vista=todas${pagina > 1 ? `&page=${pagina}` : ""}`);
}
