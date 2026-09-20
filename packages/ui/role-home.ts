/**
 * Post-login landing path per operational role (V1 product decision).
 */
export function getHomePathForRole(roleKey: string): string {
  switch (roleKey) {
    case "visit_responsible":
      return "/equipo";
    case "direction":
      return "/resumen";
    case "admin":
    case "territorial_coordinator":
    case "capturist":
      return "/crm/contacts";
    default:
      return "/crm/contacts";
  }
}

/**
 * allowedRoles decide qué se ve en el menú, no quién entra: la puerta de cada
 * pantalla es su requirePageRole. Las dos listas tienen que decir lo mismo, o el
 * menú ofrece pantallas que rebotan (o esconde otras que sí se abren por URL).
 */
export type NavItemConfig = {
  href: string;
  label: string;
  /** Nombre corto para la barra de abajo del teléfono, donde cada entrada tiene un quinto de pantalla. */
  corto?: string;
  key: string;
  allowedRoles: string[] | "all";
};

/** Alias for consumers that import `NavItem` from `@tonala/ui`. */
export type NavItem = NavItemConfig;

export type NavSectionKey = "dashboard" | "estructura" | "territorio" | "configuracion";

export const primaryNavItems: Record<NavSectionKey, NavItemConfig[]> = {
  dashboard: [
    { href: "/resumen", label: "Resumen Global", corto: "Resumen", key: "resumen", allowedRoles: ["admin", "direction", "territorial_coordinator"] },
    { href: "/analytics", label: "Análisis Demográfico", corto: "Análisis", key: "analytics", allowedRoles: ["admin", "direction"] }
  ],
  estructura: [
    { href: "/crm/contacts", label: "Directorio Ciudadano", corto: "Directorio", key: "crm", allowedRoles: ["admin", "direction", "territorial_coordinator", "capturist", "visit_responsible"] },
    // El brigadista consulta el directorio pero no da de alta ciudadanos: sale de
    // este item, no del anterior.
    { href: "/crm/nuevo", label: "Nuevo Registro", corto: "Registrar", key: "crm-nuevo", allowedRoles: ["admin", "direction", "territorial_coordinator", "capturist"] },
    { href: "/equipo", label: "Agenda Operativa", corto: "Agenda", key: "equipo", allowedRoles: ["admin", "direction", "territorial_coordinator", "capturist", "visit_responsible"] },
    { href: "/admin-equipos", label: "Gestión de Equipos", corto: "Equipos", key: "admin-equipos", allowedRoles: ["admin", "direction", "territorial_coordinator"] },
    { href: "/estructura-electoral", label: "Estructura Electoral", corto: "Estructura", key: "estructura", allowedRoles: ["admin", "direction", "territorial_coordinator"] },
  ],
  territorio: [
    { href: "/mapa", label: "Mapa en Vivo", corto: "Mapa", key: "mapa", allowedRoles: "all" },
    { href: "/admin-incidencias", label: "Gestión de Incidencias", corto: "Incidencias", key: "admin-incidencias", allowedRoles: ["admin", "direction", "territorial_coordinator"] },
    // Lo cerrado sale de la bandeja de trabajo pero no se borra: sigue aquí y
    // sigue en el mapa.
    { href: "/historial-incidencias", label: "Historial de Incidencias", corto: "Historial", key: "historial-incidencias", allowedRoles: ["admin", "direction", "territorial_coordinator"] },
    { href: "/escucha-social", label: "Escucha Social & Gestiones", corto: "Escucha", key: "escucha-social", allowedRoles: "all" },
    { href: "/admin-inbox", label: "Auditoría de Eventos", corto: "Auditoría", key: "admin-inbox", allowedRoles: ["admin", "direction", "territorial_coordinator"] },
    // Levantar una incidencia es cosa de quien coordina: la API rechaza el alta de
    // un brigadista, así que ofrecérsela en el menú solo lo llevaba a un 403.
    { href: "/reportes", label: "Alta de Reportes", corto: "Reportes", key: "reportes", allowedRoles: ["admin", "direction", "territorial_coordinator"] },
    { href: "/logistica", label: "Logística e Inventarios", corto: "Logística", key: "logistica", allowedRoles: ["admin", "direction"] }
  ],
  configuracion: [
    { href: "/perfil", label: "Mi Perfil", corto: "Perfil", key: "perfil", allowedRoles: "all" },
    { href: "/admin-usuarios", label: "Usuarios y Privilegios", corto: "Usuarios", key: "admin-usuarios", allowedRoles: ["admin"] },
    { href: "/settings", label: "Ajustes del Sistema", corto: "Ajustes", key: "settings", allowedRoles: ["admin"] }
  ]
};

export function getNavSection(section: NavSectionKey): NavItemConfig[] {
  return primaryNavItems[section];
}
