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
  /**
   * Qué es, en palabras de todos los días, debajo del nombre en el menú. Solo en las entradas cuyo
   * nombre ya usa la campaña pero no dice nada a quien llega nuevo (§4, decisión 1 del plan).
   */
  ayuda?: string;
  key: string;
  allowedRoles: readonly string[];
};

/** Alias for consumers that import `NavItem` from `@tonala/ui`. */
export type NavItem = NavItemConfig;

function entrada(href: PantallaDelPanel, key: string, label: string, corto: string, ayuda?: string): NavItemConfig {
  return { href, key, label, corto, ...(ayuda ? { ayuda } : {}), allowedRoles: rolesDePantalla(href) };
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
  // «Configuración» a secas, para el brigadista, era una sección con solo «Mi perfil» (L14).
  { clave: "configuracion", titulo: "Mi cuenta y ajustes" }
];

/**
 * Los nombres van sin apellidos («Mapa», no «Mapa en Vivo»; «Agenda», no «Agenda Operativa»): quien nunca
 * usó un CRM lee la palabra que ya conoce, y es la misma que dicen los botones (plan de experiencia
 * sencilla, L5).
 *
 * Escucha Social, Estructura Electoral, Logística y Análisis conservan el nombre con que la campaña ya
 * los conoce, y llevan debajo qué son en palabras sencillas (`ayuda`): así no se pierde a quien ya los
 * usa y se orienta quien llega nuevo. «Auditoría de Eventos» sí cambió, a «Todos los reportes»: se
 * confundía con «Auditoría de cambios», que es otra cosa (§4, decisión 1 del plan).
 */
export const primaryNavItems: Record<NavSectionKey, NavItemConfig[]> = {
  campo: [
    entrada("/mapa", "mapa", "Mapa", "Mapa"),
    entrada("/equipo", "equipo", "Agenda", "Agenda"),
    entrada("/crm/contacts", "crm", "Directorio", "Directorio"),
    entrada("/crm/nuevo", "crm-nuevo", "Registrar ciudadano", "Registrar")
  ],
  territorio: [
    entrada("/admin-incidencias", "admin-incidencias", "Incidencias", "Incidencias"),
    entrada("/escucha-social", "escucha-social", "Escucha Social y Gestiones", "Escucha", "Lo que piden los vecinos"),
    entrada("/estructura-electoral", "estructura", "Estructura Electoral", "Estructura", "Representantes por sección"),
    entrada("/logistica", "logistica", "Logística e Inventarios", "Logística", "Material y almacén")
  ],
  seguimiento: [
    entrada("/resumen", "resumen", "Resumen", "Resumen"),
    entrada("/analytics", "analytics", "Análisis Demográfico", "Análisis", "El padrón en números"),
    entrada("/admin-equipos", "admin-equipos", "Equipos", "Equipos")
    // «Todos los reportes» salió del menú (D2 del plan de auditoría de menús): repetía Incidencias sin dejar
    // actuar, y enseñaba actividades de la Agenda como incidencias. Ahora es la vista «Todas» de Incidencias.
  ],
  configuracion: [
    entrada("/perfil", "perfil", "Mi perfil", "Perfil"),
    // En un lugar fijo y fácil de encontrar, aparte de las pantallas de trabajo (§9 del plan). También se
    // llega desde el aviso de un error y desde la pantalla de «no pudimos cargar».
    entrada("/reportar-problema", "reportar-problema", "Reportar un problema", "Reportar", "Algo falla o no se entiende"),
    entrada("/admin-usuarios", "admin-usuarios", "Usuarios y permisos", "Usuarios"),
    entrada("/problemas-reportados", "problemas-reportados", "Problemas reportados", "Problemas"),
    // Las tres siguientes, solo el administrador maestro (etapa 6). «Ajustes» se retiró (D1 del plan de
    // auditoría de menús): no guardaba nada; el nombre y la contraseña están en Mi perfil → Seguridad.
    entrada("/administracion-municipal", "administracion-municipal", "Administración por municipio", "Municipios"),
    entrada("/sin-municipio", "sin-municipio", "Sin municipio confirmado", "Sin municipio"),
    entrada("/auditoria", "auditoria", "Auditoría de cambios", "Cambios")
  ]
};

export function getNavSection(section: NavSectionKey): NavItemConfig[] {
  return primaryNavItems[section];
}

/**
 * Las secciones del menú ya filtradas para un rol, sin títulos sobre un solo enlace (L14): al capturista y
 * al brigadista, «Territorio» les quedaba con una sola entrada (Escucha Social), un título que no ordena
 * nada. Una sección así se suma a la anterior. «Mi cuenta y ajustes» se queda aparte aunque tenga solo «Mi
 * perfil»: es otra cosa que el trabajo, y siempre va al final. Las secciones vacías no se enseñan.
 */
export function juntarSeccionesSueltas<T>(
  secciones: ReadonlyArray<{ clave: NavSectionKey; titulo: string; items: T[] }>
): Array<{ clave: NavSectionKey; titulo: string; items: T[] }> {
  const salida: Array<{ clave: NavSectionKey; titulo: string; items: T[] }> = [];
  for (const s of secciones) {
    if (s.items.length === 0) continue;
    const anterior = salida[salida.length - 1];
    if (s.items.length === 1 && s.clave !== "configuracion" && anterior) anterior.items = [...anterior.items, ...s.items];
    else salida.push({ ...s, items: [...s.items] });
  }
  return salida;
}

/**
 * El nombre de las pantallas que no tienen entrada en el menú (se llega a ellas desde un botón), para la barra
 * de arriba del teléfono: sin esto decía el nombre del sistema y la persona no sabía dónde estaba.
 */
export const TITULOS_FUERA_DEL_MENU: Readonly<Record<string, string>> = {
  "avisar-incidencia": "Avisar de una incidencia"
};

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
 * siguientes del menú en su orden. Perfil nunca va: se llega a él desde «Más».
 */
export function itemsDeBarraMovil<T extends Pick<NavItemConfig, "key">>(roleKey: string, permitidos: readonly T[]): T[] {
  const candidatos = permitidos.filter((item) => item.key !== "perfil");
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
