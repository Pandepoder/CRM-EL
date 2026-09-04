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

export type NavItemConfig = {
  href: string;
  label: string;
  key: string;
  allowedRoles: string[] | "all";
};

/** Alias for consumers that import `NavItem` from `@tonala/ui`. */
export type NavItem = NavItemConfig;

export type NavSectionKey = "dashboard" | "estructura" | "territorio" | "configuracion";

export const primaryNavItems: Record<NavSectionKey, NavItemConfig[]> = {
  dashboard: [
    { href: "/resumen", label: "Resumen Global", key: "resumen", allowedRoles: ["admin", "direction", "territorial_coordinator"] },
    { href: "/analytics", label: "Análisis Demográfico", key: "analytics", allowedRoles: ["admin", "direction"] }
  ],
  estructura: [
    { href: "/crm/contacts", label: "Directorio Ciudadano", key: "crm", allowedRoles: ["admin", "direction", "territorial_coordinator", "capturist", "visit_responsible"] },
    { href: "/crm/nuevo", label: "Nuevo Registro", key: "crm-nuevo", allowedRoles: ["admin", "direction", "territorial_coordinator", "capturist", "visit_responsible"] },
    { href: "/equipo", label: "Agenda Operativa", key: "equipo", allowedRoles: ["admin", "direction", "territorial_coordinator", "capturist", "visit_responsible"] },
    { href: "/admin-equipos", label: "Gestión de Equipos", key: "admin-equipos", allowedRoles: ["admin", "direction", "territorial_coordinator"] },
    { href: "/estructura-electoral", label: "Estructura Electoral", key: "estructura", allowedRoles: ["admin", "direction", "territorial_coordinator"] },
  ],
  territorio: [
    { href: "/mapa", label: "Mapa en Vivo", key: "mapa", allowedRoles: "all" },
    { href: "/admin-incidencias", label: "Gestión de Incidencias", key: "admin-incidencias", allowedRoles: ["admin", "direction", "territorial_coordinator"] },
    // Lo cerrado sale de la bandeja de trabajo pero no se borra: sigue aquí y
    // sigue en el mapa.
    { href: "/historial-incidencias", label: "Historial de Incidencias", key: "historial-incidencias", allowedRoles: ["admin", "direction", "territorial_coordinator"] },
    { href: "/escucha-social", label: "Escucha Social & Gestiones", key: "escucha-social", allowedRoles: "all" },
    { href: "/admin-inbox", label: "Auditoría de Eventos", key: "admin-inbox", allowedRoles: ["admin", "direction", "territorial_coordinator"] },
    { href: "/reportes", label: "Alta de Reportes", key: "reportes", allowedRoles: "all" },
    { href: "/logistica", label: "Logística e Inventarios", key: "logistica", allowedRoles: ["admin", "direction"] }
  ],
  configuracion: [
    { href: "/perfil", label: "Mi Perfil", key: "perfil", allowedRoles: "all" },
    { href: "/admin-usuarios", label: "Usuarios y Privilegios", key: "admin-usuarios", allowedRoles: ["admin"] },
    { href: "/settings", label: "Ajustes del Sistema", key: "settings", allowedRoles: ["admin"] }
  ]
};

export function getNavSection(section: NavSectionKey): NavItemConfig[] {
  return primaryNavItems[section];
}
