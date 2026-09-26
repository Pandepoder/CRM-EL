import type { MediaFile } from "@/components/MediaUploader";

/** Incidencia o actividad de la bitácora, tal como la manda `/api/map/reports`. */
export type ReportFeature = {
  properties: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    createdAt: string;
    sectionNum?: number;
    sectionId?: string;
    municipality?: string;
    assignedToUserId?: string | undefined;
    eventDate?: string | undefined;
    mediaUrls?: MediaFile[] | undefined;
    /** Actividad de la bitácora: se trabaja en la Agenda, no desde el mapa. */
    esActividad?: boolean;
    /** Lo que la API dejará hacer a quien mira (misma regla que PATCH y DELETE). */
    puedeActualizar?: boolean;
    puedeBorrar?: boolean;
  };
  geometry: { type: "Point"; coordinates: [number, number] };
};

export type AtlasSeccion = {
  priority: "A" | "B" | "C" | "D";
  mainColony: string | null;
  pollingPlace: string | null;
  votes: { pan: number; morena: number; mc: number };
  source: string | null;
};

export type SectionProperties = {
  id: string;
  section_num: number;
  municipality?: string;
  colonies: string[];
  contactsCount: number;
  visitsCompleted: number;
  /** Datos del atlas de campaña. Null en las secciones que el documento no cubre. */
  atlas: AtlasSeccion | null;
};

export type BloqueElectoral = "pan" | "morena" | "mc";

export type Resultado = {
  ganador: BloqueElectoral;
  votosGanador: number;
  total: number;
  /** Puntos porcentuales sobre el segundo lugar. Es lo que separa un bastión de una plaza en disputa. */
  margen: number;
  empate: boolean;
};

export type UserOption = {
  id: string;
  displayName: string;
  email: string;
  role: string;
};

export type ContactoDelMapa = {
  properties: {
    id: string;
    displayName: string;
    colony: string | null;
    municipality: string | null;
    isPanConfirmed: boolean;
    creatorName: string;
    networkColor: string;
    isApproximate: boolean;
    sectionNum: number | null;
  };
  geometry: { type: "Point"; coordinates: [number, number] };
};

export type GrupoDeContactos = { lat: number; lng: number; total: number; pan: number; aprox: boolean };

export type CoberturaContactos = {
  contactos: number;
  exactos: number;
  porSeccion: number;
  sinUbicacion: number;
  ubicables: number;
  enVista: number;
  dibujados: number;
  truncado: boolean;
};

/** Lo que se ve en el mapa: incidencias, contactos, secciones y cómo se colorean. */
export type Coloreado = "municipio" | "electoral";
