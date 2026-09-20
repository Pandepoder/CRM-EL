import { requirePageSession } from "@/lib/authorization";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // El filtro por rol vive en la propia página, junto a los datos que carga.
  // Aquí solo se comprueba la sesión para no repartir la misma regla en dos sitios.
  await requirePageSession();
  return <>{children}</>;
}
