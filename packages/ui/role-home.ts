import { rolesDePantalla, type PantallaDelPanel } from "./capacidades.js";

/**
 * Pantalla de inicio de cada rol al entrar. Tiene que ser una que el rol pueda abrir: si no, la
 * guarda lo mandaría a su inicio y de ahí otra vez a la guarda (`capacidades.test.ts` lo comprueba).
 *
 * Quien puede abrir el Resumen empieza ahí (administración —también el maestro—, dirección y líder).
 * Capturista y brigadista no lo abren, así que conservan el suyo. El middleware usa esta misma función:
 * antes tenía su propia copia, y dos listas escritas a mano acaban diciendo cosas distintas.
 */
export function getHomePathForRole(roleKey: string): string {
  switch (roleKey) {
    case "admin":
    case "direction":
    case "territorial_coordinator":
      return "/resumen";
    case "visit_responsible":
      return "/equipo";
    case "capturist":
      return "/crm/contacts";
    default:
      return "/crm/contacts";
  }
}

/**
 * Una entrada del menú. `allowedRoles` no se escribe a mano: sale de `ACCESO_A_PANTALLAS`
 * (`capacidades.ts`), la misma lista con la que cada pantalla decide quién entra. Así el menú no
 * puede ofrecer una pantalla que rebota ni esconder otra que sí se abre (M1).
 */
export type NavItemConfig = {
  href: PantallaDelPanel;
  label: string;
  /** Nombre corto para la barra de abajo del teléfono, donde cada entrada tiene un quinto de pantalla. */
  corto?: string;
  key: string;
  allowedRoles: readonly string[];
};

/** Alias for consumers that import `NavItem` from `@tonala/ui`. */
export type NavItem = NavItemConfig;

function entrada(href: PantallaDelPanel, key: string, label: string, corto: string): NavItemConfig {
  return { href, key, label, corto, allowedRoles: rolesDePantalla(href) };
}

/**
 * Cuatro secciones de tres o cuatro entradas, por lo que se hace en cada una (M5). Antes eran
 * diecisiete entradas en el orden de escritorio, con Gestión e Historial de Incidencias y Alta de
 * Reportes como tres entradas para un mismo trabajo (M11): ahora son una sola, «Incidencias», y el
 * historial y el alta se abren desde ella (siguen marcando esa entrada del menú).
 */
export type NavSectionKey = "campo" | "territorio" | "seguimiento" | "configuracion";

export const SECCIONES_DEL_MENU: ReadonlyArray<{ clave: NavSectionKey; titulo: string }> = [
  { clave: "campo", titulo: "Trabajo de campo" },
  { clave: "territorio", titulo: "Territorio" },
  { clave: "seguimiento", titulo: "Seguimiento y estructura" },
  { clave: "configuracion", titulo: "Configuración" }
];

export const primaryNavItems: Record<NavSectionKey, NavItemConfig[]> = {
  campo: [
    entrada("/mapa", "mapa", "Mapa en Vivo", "Mapa"),
    entrada("/equipo", "equipo", "Agenda Operativa", "Agenda"),
    entrada("/crm/contacts", "crm", "Directorio Ciudadano", "Directorio"),
    entrada("/crm/nuevo", "crm-nuevo", "Nuevo Registro", "Registrar")
  ],
  territorio: [
    entrada("/admin-incidencias", "admin-incidencias", "Incidencias", "Incidencias"),
    entrada("/escucha-social", "escucha-social", "Escucha Social & Gestiones", "Escucha"),
    entrada("/estructura-electoral", "estructura", "Estructura Electoral", "Estructura"),
    entrada("/logistica", "logistica", "Logística e Inventarios", "Logística")
  ],
  seguimiento: [
    entrada("/resumen", "resumen", "Resumen Global", "Resumen"),
    entrada("/analytics", "analytics", "Análisis Demográfico", "Análisis"),
    entrada("/admin-equipos", "admin-equipos", "Gestión de Equipos", "Equipos"),
    entrada("/admin-inbox", "admin-inbox", "Auditoría de Eventos", "Auditoría")
  ],
  configuracion: [
    entrada("/perfil", "perfil", "Mi Perfil", "Perfil"),
    entrada("/admin-usuarios", "admin-usuarios", "Usuarios y Privilegios", "Usuarios"),
    // Las tres siguientes y Ajustes, solo el administrador maestro (etapa 6).
    entrada("/administracion-municipal", "administracion-municipal", "Administración por municipio", "Municipios"),
    entrada("/sin-municipio", "sin-municipio", "Sin municipio confirmado", "Sin municipio"),
    entrada("/auditoria", "auditoria", "Auditoría de cambios", "Cambios"),
    entrada("/settings", "settings", "Ajustes del Sistema", "Ajustes")
  ]
};

export function getNavSection(section: NavSectionKey): NavItemConfig[] {
  return primaryNavItems[section];
}

/** Cuántas pantallas caben en la barra de abajo del teléfono, además de «Más». */
export const LUGARES_EN_BARRA_MOVIL = 4;

/**
 * Qué va en la barra de abajo del teléfono, por rol y en orden: lo que cada quien usa en la calle.
 *
 * Antes se tomaban las cuatro primeras entradas del menú, que es el orden de escritorio: a
 * Administración, Dirección y Líder les salía Resumen, Análisis, Directorio y Registrar, y para
 * llegar al Mapa o a la Agenda —lo más usado en campo— había que abrir «Más» (C9). Estando dentro
 * del mapa, la barra ni siquiera lo marcaba.
 */
const PRIORIDAD_EN_BARRA_MOVIL: Record<string, readonly string[]> = {
  admin: ["mapa", "equipo", "crm", "resumen"],
  direction: ["mapa", "equipo", "resumen", "crm"],
  territorial_coordinator: ["mapa", "equipo", "crm", "admin-incidencias"],
  capturist: ["mapa", "equipo", "crm", "crm-nuevo"],
  visit_responsible: ["mapa", "equipo", "crm", "escucha-social"]
};

/**
 * Las entradas de la barra del teléfono para un rol, tomadas de las que ya le permite el menú.
 * Si alguna de su lista no le está permitida, o el rol no tiene lista, se completa con las
 * siguientes del menú en su orden. Perfil y Ajustes nunca van: se llega a ellos desde «Más».
 */
export function itemsDeBarraMovil<T extends Pick<NavItemConfig, "key">>(roleKey: string, permitidos: readonly T[]): T[] {
  const candidatos = permitidos.filter((item) => item.key !== "perfil" && item.key !== "settings");
  const porClave = new Map(candidatos.map((item) => [item.key, item]));
  const elegidos: T[] = [];
  for (const clave of PRIORIDAD_EN_BARRA_MOVIL[roleKey] ?? []) {
    const item = porClave.get(clave);
    if (item && !elegidos.includes(item)) elegidos.push(item);
  }
  for (const item of candidatos) {
    if (elegidos.length >= LUGARES_EN_BARRA_MOVIL) break;
    if (!elegidos.includes(item)) elegidos.push(item);
  }
  return elegidos.slice(0, LUGARES_EN_BARRA_MOVIL);
}
