import { requirePageAccess } from "@/lib/authorization";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // La Agenda Operativa la usan los cinco roles. La guarda vive aquí para cubrir también las rutas
  // de debajo (equipo/mis-contactos y equipo/mis-visitas, hoy solo redirecciones). La lista debe
  // seguir igual a la de equipo/page.tsx.
  await requirePageAccess("/equipo");
  return <>{children}</>;
}
