import { requirePageRole } from "@/lib/authorization";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Dirección entra al directorio porque es donde ve a los contactos de los
  // equipos que le asignaron; el listado ya viene acotado a su alcance, así que
  // aquí no ve nada que no le corresponda. Antes quedaba fuera y el menú lateral
  // le ofrecía "Directorio Ciudadano" para después rebotarla a /resumen.
  await requirePageRole("admin", "direction", "territorial_coordinator", "capturist");
  return <>{children}</>;
}
