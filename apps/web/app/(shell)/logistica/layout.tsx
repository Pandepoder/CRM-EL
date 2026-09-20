import { requirePageRole } from "@/lib/authorization";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Inventarios los lleva administración y dirección, que es a quienes ofrece el
  // menú la sección y lo único que aceptan las acciones de logistica/actions.ts.
  await requirePageRole("admin", "direction");
  return <>{children}</>;
}
