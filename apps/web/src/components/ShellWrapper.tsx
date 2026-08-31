"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@tonala/ui";

export type ShellWrapperProps = Readonly<{
  children: React.ReactNode;
  userDisplayName: string;
  userRoleLabel: string;
  userRoleKey: string;
}>;

export function ShellWrapper({ children, userDisplayName, userRoleLabel, userRoleKey }: ShellWrapperProps) {
  const pathname = usePathname();
  
  let activeNavKey = "resumen";
  if (pathname === "/crm/nuevo") {
    activeNavKey = "crm-nuevo";
  } else if (pathname.startsWith("/crm")) {
    activeNavKey = "crm";
  } else if (pathname.startsWith("/estructura-electoral")) {
    activeNavKey = "estructura";
  } else if (pathname.startsWith("/perfil")) {
    activeNavKey = "perfil";
  } else if (pathname.startsWith("/admin-equipos")) {
    activeNavKey = "admin-equipos";
  } else if (pathname.startsWith("/admin-usuarios")) {
    activeNavKey = "admin-usuarios";
  } else if (pathname.startsWith("/admin-incidencias")) {
    activeNavKey = "admin-incidencias";
  } else if (pathname.startsWith("/admin-inbox")) {
    activeNavKey = "admin-inbox";
  } else if (pathname.startsWith("/escucha-social")) {
    activeNavKey = "escucha-social";
  } else {
    activeNavKey = pathname.split("/")[1] || "resumen";
  }

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
