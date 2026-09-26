"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@tonala/ui";

import { EnviosPendientes } from "@/components/EnviosPendientes";
import { MunicipioUsuarioProvider } from "@/lib/municipio-contexto";
import { UsuarioActualProvider } from "@/lib/usuario-contexto";

export type ShellWrapperProps = Readonly<{
  children: React.ReactNode;
  /** De quién son los envíos de la cola del teléfono que esta sesión puede reenviar. */
  userId: string;
  userDisplayName: string;
  /** Foto de perfil; sin ella, iniciales. */
  userPhotoUrl?: string | null | undefined;
  userRoleLabel: string;
  /**
   * Rol vigente según la base, no el que guardó la cookie al iniciar sesión: con él se
   * arma el menú, y así ofrece lo mismo que dejan pasar las guardas de cada pantalla.
   */
  userRoleKey: string;
  /** El administrador maestro (etapa 6): el menú le enseña además sus pantallas. */
  esMaestro?: boolean;
  /** Puede levantar incidencias y registrar actividades: lo decide el servidor con su alcance. */
  puedeCoordinar: boolean;
  /** Municipio de la persona: da la marca y el municipio con el que abre el mapa. */
  municipality?: string | null | undefined;
  /** Nombre de respaldo del despliegue mientras la persona no tenga municipio. */
  appName?: string | undefined;
}>;

export function ShellWrapper({ children, userId, userDisplayName, userPhotoUrl, userRoleLabel, userRoleKey, esMaestro = false, puedeCoordinar, municipality, appName }: ShellWrapperProps) {
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
  } else if (
    pathname.startsWith("/admin-incidencias") ||
    pathname.startsWith("/historial-incidencias") ||
    pathname.startsWith("/reportes")
  ) {
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
      userPhotoUrl={userPhotoUrl ?? null}
      userRoleLabel={userRoleLabel}
      userRoleKey={userRoleKey}
      esMaestro={esMaestro}
      puedeCoordinar={puedeCoordinar}
      municipality={municipality}
      {...(appName ? { appName } : {})}
    >
      {/* El municipio queda disponible para las pantallas de cliente —el mapa, los
          formularios— que hoy no tenían forma de saber dónde trabaja quien las abre. */}
      <MunicipioUsuarioProvider municipio={municipality ?? null}>
        <UsuarioActualProvider usuario={{ id: userId, rol: userRoleKey, puedeCoordinar }}>
          {/* Lo que quedó guardado en el teléfono sin señal se reenvía desde cualquier pantalla. */}
          <EnviosPendientes usuarioId={userId} />
          {children}
        </UsuarioActualProvider>
      </MunicipioUsuarioProvider>
    </AppShell>
  );
}
