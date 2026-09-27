import { requirePageAccess } from "@/lib/authorization";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Inventarios los lleva administración y dirección, que es a quienes ofrece el
  // menú la sección y lo único que aceptan las acciones de logistica/actions.ts.
  await requirePageAccess("/logistica");
  return <>{children}</>;
}
