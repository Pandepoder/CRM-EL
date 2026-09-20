import { requirePageRole } from "@/lib/authorization";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // La Agenda Operativa la usan los cinco roles, y la guarda vive aquí porque
  // equipo/mis-contactos y equipo/mis-visitas son componentes de cliente: sin
  // layout, se abrían por URL sin que el servidor comprobara nada. La lista debe
  // seguir igual a la de equipo/page.tsx.
  await requirePageRole("admin", "direction", "territorial_coordinator", "capturist", "visit_responsible");
  return <>{children}</>;
}
