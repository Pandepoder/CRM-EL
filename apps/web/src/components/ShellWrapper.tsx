"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell } from "@tonala/ui";

import { CapaDeAvisos } from "@/components/CapaDeAvisos";
import { CapaDeCelebracion } from "@/components/CapaDeCelebracion";
import { EnviosPendientes } from "@/components/EnviosPendientes";
import { PrimerosPasos } from "@/components/PrimerosPasos";
import { avisar } from "@/lib/avisos";
import { MunicipioUsuarioProvider } from "@/lib/municipio-contexto";
import { anotarUltimaPantalla } from "@/lib/problemas";
import { useRecordatorios } from "@/lib/recordatorios-cliente";
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
  /** Administración: reportes de problemas nuevos de su gente, el número junto a «Problemas reportados». */
  problemasNuevos?: number | undefined;
  /** Respuestas a sus reportes que la persona no ha visto: el número junto a «Reportar un problema». */
  respuestasNuevas?: number | undefined;
  /** Incidencias «por aceptar» que la persona puede aceptar: el número junto a «Incidencias». */
  porAceptar?: number | undefined;
}>;

export function ShellWrapper({ children, userId, userDisplayName, userPhotoUrl, userRoleLabel, userRoleKey, esMaestro = false, puedeCoordinar, municipality, appName, problemasNuevos = 0, respuestasNuevas = 0, porAceptar = 0 }: ShellWrapperProps) {
  const pathname = usePathname();

  // Para que «Reportar un problema», abierto desde el menú, ya diga en qué pantalla estaba (§9 del plan).
  useEffect(() => {
    anotarUltimaPantalla(pathname);
  }, [pathname]);

  // «Te respondieron»: una vez por sesión y por número, fuera de la pantalla de reportes (ahí ya se ve).
  useEffect(() => {
    if (respuestasNuevas <= 0 || pathname.startsWith("/reportar-problema")) return;
    const clave = `reportar-problema:avisado:${userId}`;
    try {
      if (window.sessionStorage.getItem(clave) === String(respuestasNuevas)) return;
      window.sessionStorage.setItem(clave, String(respuestasNuevas));
    } catch {
      /* sin almacenamiento: se avisa igual */
    }
    avisar(
      respuestasNuevas === 1 ? "Te respondieron un reporte." : `Te respondieron ${respuestasNuevas} reportes.`,
      "info",
      { accion: { etiqueta: "Ver respuesta", href: "/reportar-problema" }, duracion: 15_000 }
    );
    // Solo cuando cambia el número, no en cada cambio de pantalla: por eso `pathname` no está en la lista.
  }, [respuestasNuevas, userId]);
  // Lo vencido y lo que toca en las próximas horas: el número junto a «Agenda Operativa».
  const recordatorios = useRecordatorios();
  const pendientesDeAgenda = recordatorios ? recordatorios.totalVencidas + recordatorios.totalProximas : 0;
  
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
  } else if (pathname.startsWith("/admin-incidencias") || pathname.startsWith("/reportes")) {
    activeNavKey = "admin-incidencias";
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
      insignias={{ equipo: pendientesDeAgenda, "admin-incidencias": porAceptar, "problemas-reportados": problemasNuevos, "reportar-problema": respuestasNuevas }}
      // Navegar desde el menú sin recargar la página entera (C14): más rápido con mala señal, y los avisos
      // y la celebración siguen en pantalla al cambiar de sección.
      Enlace={Link}
    >
      {/* El municipio queda disponible para las pantallas de cliente —el mapa, los
          formularios— que hoy no tenían forma de saber dónde trabaja quien las abre. */}
      <MunicipioUsuarioProvider municipio={municipality ?? null}>
        <UsuarioActualProvider usuario={{ id: userId, rol: userRoleKey, puedeCoordinar }}>
          {/* Lo que quedó guardado en el teléfono sin señal se reenvía desde cualquier pantalla. */}
          <EnviosPendientes usuarioId={userId} />
          {/* Lo básico de cada rol, en su pantalla de inicio, hasta que lo cierra. */}
          <PrimerosPasos usuarioId={userId} rol={userRoleKey} nombre={userDisplayName} />
          {children}
          {/* Aviso, vibración y confeti al guardar; anuncia la meta del día y las insignias nuevas. */}
          <CapaDeCelebracion usuarioId={userId} />
          {/* Los avisos que antes eran alert(): abajo, con color, y se pueden cerrar. */}
          <CapaDeAvisos />
        </UsuarioActualProvider>
      </MunicipioUsuarioProvider>
    </AppShell>
  );
}
