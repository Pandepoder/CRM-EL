import type { EstadoVisible } from "@/lib/actividades";

/**
 * Tipos compartidos entre la consulta del servidor y los componentes de la bitácora. Solo tipos:
 * este archivo no importa nada del servidor para poder usarse también desde el cliente.
 */

export type ArchivoMedia = { url: string; type?: string; name?: string; [clave: string]: unknown };

export type OrigenActividad = "actividad" | "visita";

export type ActividadItem = {
  id: string;
  /** "visita": una visita agendada desde la ficha del contacto que no pertenece a ninguna actividad. */
  origen: OrigenActividad;
  status: string;
  estado: EstadoVisible;
  scheduledAt: string;
  title: string;
  description: string;
  location: string;
  locationText: string | null;
  estimatedAttendees: number | null;
  latitude: number | null;
  longitude: number | null;
  contactId: string | null;
  contactName: string | null;
  tipo: { id: string; nombre: string; clave: string | null; color: string | null } | null;
  /** Categoría de incidencia con la que se ve en el mapa; para actividades sin tipo propio. */
  categoria: string;
  etiquetas: Array<{ id: string; name: string }>;
  outcome: string | null;
  outcomeSummary: string | null;
  cancelReason: string | null;
  closedAt: string | null;
  closedByName: string | null;
  assignedUserId: string | null;
  assignedUserName: string;
  createdByName: string | null;
  sectionId: string | null;
  sectionNum: number | null;
  municipality: string | null;
  mediaUrls: ArchivoMedia[];
  visitId: string | null;
  followUpOfId: string | null;
  /** Hay un seguimiento derivado de esta actividad. */
  tieneSeguimiento: boolean;
  /** Puede completarla, reprogramarla, cancelarla, anotarla o editarla. */
  puedeActuar: boolean;
  puedeBorrar: boolean;
};

export type VistaBitacora =
  | "hoy"
  | "vencidas"
  | "proximas"
  | "seguimiento"
  | "historial"
  | "semana"
  | "mes"
  | "todas";

export const VISTAS_BITACORA: ReadonlyArray<{ clave: VistaBitacora; etiqueta: string; rapida: boolean }> = [
  { clave: "hoy", etiqueta: "Hoy", rapida: true },
  { clave: "vencidas", etiqueta: "Vencidas", rapida: true },
  { clave: "proximas", etiqueta: "Próximas", rapida: true },
  { clave: "seguimiento", etiqueta: "Con seguimiento", rapida: true },
  { clave: "historial", etiqueta: "Historial", rapida: true },
  { clave: "semana", etiqueta: "Esta semana", rapida: false },
  { clave: "mes", etiqueta: "Este mes", rapida: false },
  { clave: "todas", etiqueta: "Todas", rapida: false }
];

export const ESTADOS_FILTRO = ["programada", "en_curso", "vencida", "completada", "cancelada", "archivada"] as const;
export type EstadoFiltro = (typeof ESTADOS_FILTRO)[number];

export type FiltrosBitacora = {
  vista: VistaBitacora;
  /** AAAA-MM-DD en la zona horaria de la bitácora. Si hay periodo personalizado, manda sobre la vista. */
  desde: string | null;
  hasta: string | null;
  scope: "mis" | "equipo";
  responsableId: string | null;
  tipoId: string | null;
  estado: EstadoFiltro | null;
  resultado: string | null;
  contactoId: string | null;
  etiquetaId: string | null;
  q: string;
  pagina: number;
  /** Solo desde el servidor (ficha de una actividad): ignora vistas y filtros. */
  id: string | null;
};

export type PaginaBitacora = {
  items: ActividadItem[];
  total: number;
  pagina: number;
  tamano: number;
  /** Cuántos registros hay en cada vista rápida, con los demás filtros aplicados. */
  conteos: Partial<Record<VistaBitacora, number>>;
};

export type EstadisticaLider = {
  userId: string;
  displayName: string;
  email: string;
  roleKey: string;
  roleName: string;
  teamName: string;
  /** Actividades atribuidas a esta persona (cada una a UNA sola: ver `lib/bitacora-consulta`). */
  totalActivities: number;
  completedActivities: number;
  pendingActivities: number;
  overdueActivities: number;
  /** Desglose por tipo, de mayor a menor. Los tipos nuevos aparecen solos. */
  tipos: Array<{ nombre: string; total: number }>;
  contactsCount: number;
  completionRate: number;
  latestActivityAt: string | null;
};

export type ResumenBitacora = {
  lideres: EstadisticaLider[];
  /** Descripción legible del periodo y alcance que abarcan las cifras. */
  descripcion: string;
};

export type OpcionSelector = {
  id: string;
  nombre: string;
  detalle?: string | null;
  /** Solo para tipos de actividad: si agendan también una visita del contacto. */
  creaVisita?: boolean;
};
