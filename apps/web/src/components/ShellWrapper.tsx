"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@tonala/ui";

import { MunicipioUsuarioProvider } from "@/lib/municipio-contexto";

export type ShellWrapperProps = Readonly<{
  children: React.ReactNode;
  userDisplayName: string;
  userRoleLabel: string;
  /**
   * Rol vigente según la base, no el que guardó la cookie al iniciar sesión: con él se
   * arma el menú, y así ofrece lo mismo que dejan pasar las guardas de cada pantalla.
   */
  userRoleKey: string;
  /** Municipio de la persona: da la marca y el municipio con el que abre el mapa. */
  municipality?: string | null | undefined;
  /** Nombre de respaldo del despliegue mientras la persona no tenga municipio. */
  appName?: string | undefined;
}>;

export function ShellWrapper({ children, userDisplayName, userRoleLabel, userRoleKey, municipality, appName }: ShellWrapperProps) {
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
      municipality={municipality}
      {...(appName ? { appName } : {})}
    >
      {/* El municipio queda disponible para las pantallas de cliente —el mapa, los
          formularios— que hoy no tenían forma de saber dónde trabaja quien las abre. */}
      <MunicipioUsuarioProvider municipio={municipality ?? null}>{children}</MunicipioUsuarioProvider>
    </AppShell>
  );
}
