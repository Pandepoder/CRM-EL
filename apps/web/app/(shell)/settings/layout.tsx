import { requirePageAccess } from "@/lib/authorization";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Único sitio donde se decide quién entra a los ajustes del sistema: las páginas
  // de debajo no repiten la comprobación, se apoyan en esta.
  await requirePageAccess("/settings");
  return <>{children}</>;
}
