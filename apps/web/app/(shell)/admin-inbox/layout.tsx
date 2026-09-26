import { requirePageAccess } from "@/lib/authorization";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePageAccess("/admin-inbox");
  return <>{children}</>;
}
