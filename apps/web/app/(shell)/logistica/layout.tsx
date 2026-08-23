import { requirePageRole } from "@/lib/authorization";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePageRole();
  return <>{children}</>;
}
