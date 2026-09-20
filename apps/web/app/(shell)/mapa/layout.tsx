import { requirePageSession } from "@/lib/authorization";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // El mapa lo abre cualquier rol: lo que cambia por rol es lo que trae cada capa,
  // y eso ya lo acota la API por alcance. Aquí solo hace falta sesión iniciada.
  await requirePageSession();
  return <>{children}</>;
}
