/**
 * Quién abre cada pantalla del panel. Es la única lista.
 *
 * De aquí salen el menú (`role-home.ts`) y la guarda de cada pantalla (`requirePageAccess`, en
 * `apps/web/src/lib/authorization.ts`). Antes eran dos listas escritas a mano en dos sitios, y el
 * menú ofrecía pantallas que al abrirlas rebotaban (M1) o había pantallas que se saltaban la guarda
 * común (M9). `tests/unit/capacidades.test.ts` falla si una pantalla del panel se protege con otra
 * lista, si una entrada del menú no está aquí o si la pantalla de inicio de un rol no se la deja
 * abrir.
 *
 * Esto decide quién ENTRA. Lo que cada quien ve dentro lo sigue decidiendo el alcance
 * (`resolveUserNetworkScope`), y lo que puede escribir, cada API.
 */

export const ROLES_DEL_SISTEMA = ["admin", "direction", "territorial_coordinator", "capturist", "visit_responsible"] as const;
export type RolDelSistema = (typeof ROLES_DEL_SISTEMA)[number];

/**
 * El administrador maestro (etapa 6) no es un rol de la tabla `roles`: es una cuenta de administración
 * con la marca `is_master_admin`. Abre todo lo que abre administración (su rol sigue siendo `admin`) y,
 * además, lo que aquí se reserva a `master_admin`.
 */
export const ROL_MAESTRO = "master_admin" as const;
export type RolDeAcceso = RolDelSistema | typeof ROL_MAESTRO;
const MAESTRO = [ROL_MAESTRO] as const;

const TODOS = ROLES_DEL_SISTEMA;
/** Quien coordina: administración, dirección y líder. */
const MANDO = ["admin", "direction", "territorial_coordinator"] as const;

export const ACCESO_A_PANTALLAS = {
  "/resumen": MANDO,
  "/analytics": ["admin", "direction"],
  "/crm/contacts": TODOS,
  // El brigadista consulta el directorio pero no da de alta ciudadanos.
  "/crm/nuevo": ["admin", "direction", "territorial_coordinator", "capturist"],
  "/equipo": TODOS,
  "/admin-equipos": MANDO,
  "/estructura-electoral": MANDO,
  // El mapa lo abre cualquiera: lo que cambia por rol es lo que trae cada capa, y eso lo acota la API.
  "/mapa": TODOS,
  "/admin-incidencias": MANDO,
  // Lo cerrado sale de la bandeja de trabajo pero no se borra: sigue aquí y en el mapa.
  "/historial-incidencias": MANDO,
  // Levantar una incidencia es de quien coordina: la API rechaza el alta de un brigadista.
  "/reportes": MANDO,
  "/escucha-social": TODOS,
  "/admin-inbox": MANDO,
  "/logistica": ["admin", "direction"],
  "/perfil": TODOS,
  "/admin-usuarios": ["admin"],
  // Etapa 6: lo que gobierna todo el estado es del administrador maestro.
  // Administradores por municipio: quién administra cada uno, alertas y recuperación de acceso.
  "/administracion-municipal": MAESTRO,
  // Asignar municipio a lo que quedó en General (etapa 5). Lo que está en General no es de ningún
  // municipio, y cambiar a alguien de municipio es del maestro.
  "/sin-municipio": MAESTRO,
  // Quién cambió qué: roles, municipios, altas, bajas, contraseñas, exportaciones.
  "/auditoria": MAESTRO,
  "/settings": MAESTRO
} as const satisfies Record<string, readonly RolDeAcceso[]>;

export type PantallaDelPanel = keyof typeof ACCESO_A_PANTALLAS;

export function rolesDePantalla(pantalla: PantallaDelPanel): readonly RolDeAcceso[] {
  return ACCESO_A_PANTALLAS[pantalla];
}

export function puedeAbrir(pantalla: PantallaDelPanel, rol: string): boolean {
  return (ACCESO_A_PANTALLAS[pantalla] as readonly string[]).includes(rol);
}

/** Los roles con que se decide el acceso: el del perfil y, para el maestro, `master_admin`. */
export function rolesDeAcceso(rol: string, esMaestro: boolean): string[] {
  return esMaestro ? [rol, ROL_MAESTRO] : [rol];
}
