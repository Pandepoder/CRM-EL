/**
 * Definiciones de los prospectos que comparten servidor y cliente. Solo constantes y tipos.
 */

export type Disposicion = {
  label: string;
  /** Clases de color de la insignia. */
  clase: string;
};

export const DISPOSICIONES: Record<string, Disposicion> = {
  interesado: { label: "Interesado", clase: "bg-emerald-100 text-emerald-800" },
  por_conocer: { label: "Por conocer la propuesta", clase: "bg-blue-100 text-blue-800" },
  sin_definicion: { label: "Sin definición", clase: "bg-amber-100 text-amber-800" },
  simpatiza_otro: { label: "Simpatiza con otro", clase: "bg-orange-100 text-orange-800" },
  no_interesado: { label: "No interesado", clase: "bg-gray-200 text-gray-700" }
};

export const CLAVES_DISPOSICION = Object.keys(DISPOSICIONES);

export function esDisposicionValida(valor: unknown): valor is string {
  return typeof valor === "string" && Object.hasOwn(DISPOSICIONES, valor);
}

/**
 * Las notas del registro rápido se llamaban «privadas», pero el servidor las entrega a todo el
 * alcance de red de quien las escribió: la propia persona, su equipo y quienes la supervisan.
 * El nombre ahora dice lo que es. Tras convertir el prospecto pasan a la nota del contacto,
 * que tiene la misma visibilidad que el contacto.
 */
export const ETIQUETA_NOTAS_INTERNAS = "Notas internas (las ven tu equipo y quien te supervisa)";

export type ProspectoItem = {
  id: string;
  prospectName: string;
  organizationOrReference: string | null;
  profileType: string;
  profileOptionId: string | null;
  profileName: string;
  disposition: string;
  dispositionNotes: string | null;
  activityDate: string;
  locationText: string | null;
  commitments: string | null;
  privateNotes: string | null;
  nextStep: string | null;
  nextStepAt: string | null;
  convertedToContactId: string | null;
  convertedAt: string | null;
  createdByUserId: string;
  createdByName: string | null;
  createdAt: string;
  puedeEditar: boolean;
};

export type PosibleContacto = { id: string; nombre: string; detalle: string | null };
