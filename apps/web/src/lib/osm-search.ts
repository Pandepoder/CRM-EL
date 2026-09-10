/**
 * Consultas a Nominatim (OpenStreetMap) para los dos buscadores de dirección
 * de la aplicación: el del mapa (autocompletado) y el de la ficha de contacto.
 *
 * Estaban implementados por separado y no coincidían en nada: distinto recuadro
 * geográfico, distinto agente, distinto tiempo de espera y distinta forma de
 * situar la consulta. El del mapa cubría medio occidente de México con
 * `bounded=0` —es decir, sin restricción real— y el otro no acotaba en absoluto.
 *
 * Después se acotaron al AMG, que resolvía los homónimos de Chapala pero dejaba
 * fuera al resto del estado: una búsqueda en Tepatitlán o en Puerto Vallarta se
 * buscaba primero en Guadalajara. Ahora el recuadro es el del municipio en que se
 * captura, sacado de su cartografía real, y solo si ahí no hay nada se amplía a
 * Jalisco.
 */

import {
  RECUADRO_JALISCO as RECUADRO_JALISCO_GEO,
  buscarMunicipio,
  recuadroNominatim,
  sinAcentos
} from "./municipios-jalisco";

/**
 * Recuadro del AMG: Zapopan al poniente, Zapotlanejo al oriente, Tlajomulco e
 * Ixtlahuacán al sur. Ya no es el valor por omisión; se conserva exportado para
 * quien necesite acotar explícitamente a la zona metropolitana.
 */
export const RECUADRO_AMG = "-103.70,20.95,-102.95,20.35";

/** Jalisco entero, desde el catálogo de municipios. */
export const RECUADRO_JALISCO = recuadroNominatim(RECUADRO_JALISCO_GEO, 0.05);

type Opciones = {
  /** Aplica el recuadro como restricción dura (`bounded=1`). */
  acotado: boolean;
  recuadro?: string;
  limite?: number;
  /** El autocompletado dispara por pulsación, así que espera menos. */
  msEspera?: number;
};

/**
 * Situa una búsqueda en su municipio salvo que el texto ya diga dónde está.
 *
 * El sufijo hace falta de verdad, no es adorno: medido contra Nominatim, "Loma
 * Dorada" a secas no encuentra la Avenida Loma Dorada de Tonalá —gana un paraje
 * homónimo de Chapala—, mientras que "Loma Dorada, Tonalá, Jalisco" devuelve sus
 * tres tramos. El recuadro acota, el sufijo orienta; hacen falta los dos.
 *
 * El texto "ya dice dónde está" si menciona Jalisco o si alguno de sus tramos
 * separados por coma es el nombre de un municipio. Antes bastaba con que apareciera
 * una de cinco palabras del AMG en cualquier parte, así que el resto del estado
 * nunca contaba como situado. Solo se aceptan nombres exactos tras una coma para
 * no confundir una calle "Tequila" o "Colotlán" con el municipio.
 */
export function situarConsulta(texto: string, municipio?: string | null): string {
  const limpio = texto.trim();
  const mencionaJalisco = /(^|[^a-z])jalisco([^a-z]|$)/.test(sinAcentos(limpio));
  const tramoConMunicipio = limpio
    .split(",")
    .slice(1)
    .some((tramo) => buscarMunicipio(tramo) !== null);
  if (mencionaJalisco || tramoConMunicipio) return limpio;
  return municipio ? `${limpio}, ${municipio}, Jalisco` : `${limpio}, Jalisco`;
}

export type ResultadoBusqueda = Readonly<{
  filas: any[];
  /**
   * Nominatim rechazó la petición o no respondió. Es distinto de "no hay
   * resultados": significa que no sabemos si los hay.
   */
  saturado: boolean;
}>;

/**
 * Caché en memoria de las respuestas de Nominatim.
 *
 * Nominatim admite una petición por segundo y bloquea a quien abusa, y todas
 * las de este sistema salen por la única IP del servidor. Con varias personas
 * capturando a la vez —el caso normal en jornada— se rebasa ese límite sin
 * esfuerzo, y el buscador de domicilios deja de encontrar nada.
 *
 * Las búsquedas se repiten muchísimo: una brigada trabaja una colonia entera y
 * teclea las mismas calles una y otra vez. Guardarlas quita la mayor parte del
 * tráfico.
 *
 * Vive en `globalThis` para sobrevivir al hot-reload de Next, igual que el
 * caché de secciones.
 */
declare global {
  var __tonalaOsmCache: Map<string, { cuando: number; filas: any[] }> | undefined;
}

const TTL_MS = 15 * 60 * 1000;
const MAX_ENTRADAS = 500;

function cache(): Map<string, { cuando: number; filas: any[] }> {
  if (!globalThis.__tonalaOsmCache) globalThis.__tonalaOsmCache = new Map();
  return globalThis.__tonalaOsmCache;
}

export function invalidarCacheOSM(): void {
  globalThis.__tonalaOsmCache = undefined;
}

export async function buscarEnOSM(consulta: string, opciones: Opciones): Promise<ResultadoBusqueda> {
  const recuadro = opciones.recuadro ?? RECUADRO_JALISCO;
  const clave = [
    consulta.toLowerCase().trim(),
    opciones.acotado ? "1" : "0",
    recuadro,
    String(opciones.limite ?? 8)
  ].join("|");

  const guardado = cache().get(clave);
  if (guardado && Date.now() - guardado.cuando < TTL_MS) {
    return { filas: guardado.filas, saturado: false };
  }

  const params = new URLSearchParams({
    format: "json",
    q: consulta,
    countrycodes: "mx",
    addressdetails: "1",
    limit: String(opciones.limite ?? 8),
    "accept-language": "es-MX,es"
  });
  if (opciones.acotado) {
    params.set("viewbox", recuadro);
    params.set("bounded", "1");
  }

  const controlador = new AbortController();
  const corte = setTimeout(() => controlador.abort(), opciones.msEspera ?? 3500);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        "User-Agent": "Tonala-OS-CRM/1.0 (territorial-planning-system)",
        "Accept-Language": "es-MX,es;q=0.9"
      },
      signal: controlador.signal
    });

    // Un 429 o un 403 devolvian un array vacio, exactamente igual que "no hay
    // resultados". Quien capturaba leia "no se encontro la direccion" cuando en
    // realidad nos habian limitado por exceso de peticiones, y no habia forma de
    // distinguirlo ni desde la pantalla ni desde los registros.
    if (!res.ok) {
      console.warn(`Nominatim respondió ${res.status} para "${consulta}"`);
      return { filas: [], saturado: true };
    }

    const datos = await res.json();
    const filas = Array.isArray(datos) ? datos : [];

    const c = cache();
    // Se guardan también las respuestas vacías: son un "aquí no hay nada"
    // legítimo y repetirlas contra Nominatim no aporta.
    if (c.size >= MAX_ENTRADAS) {
      const primera = c.keys().next();
      if (!primera.done) c.delete(primera.value);
    }
    c.set(clave, { cuando: Date.now(), filas });

    return { filas, saturado: false };
  } catch {
    // Tiempo agotado o red caída. Tampoco es "no hay resultados".
    return { filas: [], saturado: true };
  } finally {
    clearTimeout(corte);
  }
}

/**
 * Primero dentro del municipio de captura; si ahí no hay nada, se amplía a
 * Jalisco antes de darse por vencido. Ampliar solo cuando el resultado sería vacío
 * evita que una coincidencia lejana desplace a una cercana. Sin municipio conocido
 * se busca directamente en todo el estado.
 *
 * La segunda consulta solo se lanza si la primera respondió de verdad. Antes se
 * disparaba también cuando la primera había fallado, de modo que cada rechazo
 * por exceso de peticiones provocaba una petición más: justo lo contrario de lo
 * que conviene cuando te están limitando.
 */
export async function buscarDireccion(
  texto: string,
  municipio?: string | null,
  opciones?: { limite?: number; msEspera?: number }
): Promise<ResultadoBusqueda> {
  const delCatalogo = buscarMunicipio(municipio);
  const consulta = situarConsulta(texto, delCatalogo?.name ?? null);

  if (!delCatalogo) {
    return buscarEnOSM(consulta, { acotado: true, recuadro: RECUADRO_JALISCO, ...opciones });
  }

  const cercanas = await buscarEnOSM(consulta, {
    acotado: true,
    recuadro: recuadroNominatim(delCatalogo.bbox),
    ...opciones
  });
  if (cercanas.saturado || cercanas.filas.length > 0) return cercanas;
  return buscarEnOSM(consulta, { acotado: true, recuadro: RECUADRO_JALISCO, ...opciones });
}
