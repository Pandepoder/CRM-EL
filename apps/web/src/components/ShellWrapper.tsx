"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const AppShell = dynamic(() => import("@tonala/ui").then(mod => mod.AppShell), { ssr: false });

export type ShellWrapperProps = Readonly<{
  children: React.ReactNode;
  userDisplayName: string;
  userRoleLabel: string;
  userRoleKey: string;
}>;

export function ShellWrapper({ children, userDisplayName, userRoleLabel, userRoleKey }: ShellWrapperProps) {
  const pathname = usePathname();
  const activeNavKey = pathname.split("/")[1] || "resumen";

  return (
    <AppShell
      activeNavKey={activeNavKey}
      userDisplayName={userDisplayName}
      userRoleLabel={userRoleLabel}
      userRoleKey={userRoleKey}
    >
      {children}
    </AppShell>
  );
}
