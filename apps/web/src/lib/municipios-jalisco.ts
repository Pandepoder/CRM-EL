import catalogoCrudo from "../../public/geo/jalisco-municipalities.json";

/**
 * Catálogo único de los municipios de Jalisco que tienen cartografía cargada.
 *
 * Todo lo que necesita saber qué municipios existen, dónde están o cómo se escriben lee de
 * aquí: el selector del mapa, los formularios de alta, el buscador de domicilios y la
 * detección de municipio a partir de lo que devuelve OpenStreetMap.
 *
 * Antes cada pantalla tenía su lista escrita a mano —de siete a doce municipios del AMG— y
 * todas caían a "Tonalá" cuando algo no cuadraba. Con la cartografía de los 125 municipios
 * ya en la base, eso dejaba fuera de la aplicación a casi todo Jalisco.
 *
 * El JSON lo genera `pnpm db:export-municipios` desde la base, así que sus nombres coinciden
 * exactamente con electoral_sections.municipality, acentos incluidos.
 */

export type MunicipioJalisco = Readonly<{
  name: string;
  /** Secciones electorales con geometría. */
  count: number;
  /** [lat, lng] del centro del recuadro. */
  center: readonly [number, number];
  /** [minLng, minLat, maxLng, maxLat] */
  bbox: readonly [number, number, number, number];
}>;

/** Valor del selector para ver el estado completo, sin filtrar por municipio. */
export const TODO_JALISCO = "all";

type Crudo = { name: string; count: number; center?: number[]; bbox?: number[] };

/** Recuadro del estado completo: Nayarit al norte, Colima al sur. */
const RECUADRO_ESTADO: readonly [number, number, number, number] = [-105.7, 18.9, -101.5, 22.75];

export const MUNICIPIOS_JALISCO: readonly MunicipioJalisco[] = (catalogoCrudo as readonly Crudo[])
  .map((m) => {
    const bbox =
      m.bbox?.length === 4 ? (m.bbox as unknown as [number, number, number, number]) : RECUADRO_ESTADO;
    const center: [number, number] =
      m.center?.length === 2
        ? [m.center[0]!, m.center[1]!]
        : [(bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2];
    return { name: m.name, count: m.count, center, bbox };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "es"));

export const TOTAL_SECCIONES_JALISCO = MUNICIPIOS_JALISCO.reduce((n, m) => n + m.count, 0);

/** Recuadro que envuelve a todos los municipios del catálogo. */
export const RECUADRO_JALISCO: readonly [number, number, number, number] =
  MUNICIPIOS_JALISCO.length === 0
    ? RECUADRO_ESTADO
    : MUNICIPIOS_JALISCO.reduce<[number, number, number, number]>(
        (acc, m) => [
          Math.min(acc[0], m.bbox[0]),
          Math.min(acc[1], m.bbox[1]),
          Math.max(acc[2], m.bbox[2]),
          Math.max(acc[3], m.bbox[3])
        ],
        [Infinity, Infinity, -Infinity, -Infinity]
      );

export const CENTRO_JALISCO: readonly [number, number] = [
  (RECUADRO_JALISCO[1] + RECUADRO_JALISCO[3]) / 2,
  (RECUADRO_JALISCO[0] + RECUADRO_JALISCO[2]) / 2
];

/** Minúsculas y sin acentos, para comparar nombres escritos de cualquier forma. */
export function sinAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

const NORMALIZADOS = MUNICIPIOS_JALISCO.map((m) => ({ municipio: m, clave: sinAcentos(m.name) }));
const POR_CLAVE = new Map(NORMALIZADOS.map((n) => [n.clave, n.municipio]));

const escaparRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Municipio del catálogo por su nombre, sin importar acentos ni mayúsculas. */
export function buscarMunicipio(nombre?: string | null): MunicipioJalisco | null {
  if (!nombre) return null;
  return POR_CLAVE.get(sinAcentos(nombre)) ?? null;
}

/**
 * Nombre canónico del municipio al que se refiere un texto libre, o null si no se puede
 * saber con certeza.
 *
 * Pensado para lo que devuelve OpenStreetMap, que escribe "Tlaquepaque" donde el INE dice
 * "San Pedro Tlaquepaque", o "Tlajomulco" por "Tlajomulco de Zúñiga". Devuelve null ante
 * cualquier ambigüedad —"Ixtlahuacán" puede ser de los Membrillos o del Río— en vez de
 * elegir uno: un municipio inventado se guarda y ya nadie lo revisa, un hueco se ve.
 */
export function resolverMunicipio(texto?: string | null): string | null {
  if (!texto) return null;
  const t = sinAcentos(texto)
    .replace(/^(municipio|mpio\.?)\s+de\s+/, "")
    .replace(/,?\s*(jalisco|jal\.?)$/, "")
    .trim();
  if (t.length < 3) return null;

  const exacto = POR_CLAVE.get(t);
  if (exacto) return exacto.name;

  // Un nombre completo aparece dentro del texto: gana el más largo, para que
  // "San Pedro Tlaquepaque" no pierda contra un municipio de nombre más corto.
  const contenidos = NORMALIZADOS.filter((n) =>
    new RegExp(`(^|[^a-z0-9])${escaparRegex(n.clave)}([^a-z0-9]|$)`).test(t)
  );
  if (contenidos.length > 0) {
    return contenidos.sort((a, b) => b.clave.length - a.clave.length)[0]!.municipio.name;
  }

  // El texto es un fragmento de palabras completas de un único nombre.
  const fragmento = new RegExp(`(^|\\s)${escaparRegex(t)}(\\s|$)`);
  const candidatos = NORMALIZADOS.filter((n) => fragmento.test(n.clave));
  return candidatos.length === 1 ? candidatos[0]!.municipio.name : null;
}

/** Recuadro de Nominatim (izquierda, arriba, derecha, abajo) con un margen en grados. */
export function recuadroNominatim(
  bbox: readonly [number, number, number, number],
  margen = 0.02
): string {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return [minLng - margen, maxLat + margen, maxLng + margen, minLat - margen].map((n) => n.toFixed(4)).join(",");
}

/**
 * Municipio en el que trabaja quien usa este navegador.
 *
 * El mapa y los formularios de captura lo comparten para no volver a preguntarlo en cada
 * pantalla: antes cada recarga devolvía el mapa a Tonalá y cada formulario arrancaba ahí.
 * Vive solo en el navegador; el acceso a localStorage va protegido porque en algunos
 * navegadores o modos privados lanza.
 */
const CLAVE_PREFERIDO = "crm.municipioPreferido";

export function leerMunicipioPreferido(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const guardado = window.localStorage.getItem(CLAVE_PREFERIDO);
    if (guardado === TODO_JALISCO) return TODO_JALISCO;
    return buscarMunicipio(guardado)?.name ?? null;
  } catch {
    return null;
  }
}

export function guardarMunicipioPreferido(nombre: string): void {
  if (typeof window === "undefined") return;
  if (nombre !== TODO_JALISCO && !buscarMunicipio(nombre)) return;
  try {
    window.localStorage.setItem(CLAVE_PREFERIDO, nombre);
  } catch {
    // Sin almacenamiento disponible solo se pierde la comodidad de recordarlo.
  }
}
