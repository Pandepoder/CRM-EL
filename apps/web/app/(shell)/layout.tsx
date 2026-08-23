import { redirect } from "next/navigation";

import { ShellWrapper } from "@/components/ShellWrapper";
import { getServerSession } from "@/lib/session-server";

export default async function ShellLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  return (
    <ShellWrapper
      userDisplayName={session.displayName}
      userRoleLabel={session.roleName}
      userRoleKey={session.roleKey}
    >
      {children}
    </ShellWrapper>
  );
}
