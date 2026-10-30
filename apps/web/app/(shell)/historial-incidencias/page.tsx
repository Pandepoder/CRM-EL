import { redirect } from "next/navigation";

/**
 * Pantalla retirada (plan de auditoría de menús, D2). El historial es la vista «Cerradas» de Incidencias,
 * con buscador y filtros; aquí solo se redirige a quien llegue por un enlace o un marcador viejo. La guarda
 * la pone la pantalla de destino.
 */
export default async function HistorialRetirado({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const pagina = Number.parseInt(page ?? "", 10);
  redirect(`/admin-incidencias?vista=cerradas${pagina > 1 ? `&page=${pagina}` : ""}`);
}
