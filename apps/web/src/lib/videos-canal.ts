import { unstable_cache } from "next/cache";

/**
 * Últimos videos publicados en el canal de YouTube.
 *
 * La página "Conóceme" traía los videos escritos a mano: cada video nuevo obligaba a pegar su
 * identificador en el código y volver a desplegar, así que la página se quedaba meses atrás del
 * canal. Ahora se leen del canal mismo.
 *
 * Se intenta por dos caminos, en este orden:
 *
 *   1. El canal RSS que YouTube publica abierto (`/feeds/videos.xml`). Es el camino bueno: una
 *      respuesta de unos kilobytes, con la fecha exacta de cada video y sin llave de API. Pero
 *      no todos los canales lo tienen: el de la campaña responde 404 ahí, y por eso la página
 *      llevaba desde el principio enseñando la lista de respaldo en vez de lo último.
 *
 *   2. Las pestañas públicas del canal (`/videos` y `/shorts`), leídas tal como las sirve
 *      YouTube a un navegador. Es lo que sí funciona para este canal, y además es lo único que
 *      trae los Shorts, que es donde se publica casi a diario. A cambio, YouTube no promete que
 *      el formato de esa página no cambie; si cambia, esto deja de encontrar videos y se cae al
 *      respaldo, que es exactamente lo que pasaba antes. Nunca rompe la página.
 *
 * Si los dos fallan —el servidor sin salida a internet, YouTube caído— se devuelve la lista de
 * respaldo que se le pase.
 *
 * Lo que se guarda una hora es la lista ya leída, no las páginas de YouTube: son más de un
 * megabyte cada una y no tienen por qué ocupar la caché de datos.
 *
 * Para cambiar de canal no hace falta tocar código: `YOUTUBE_CANAL_ID` en el entorno. El
 * identificador es el que empieza con `UC`; se ve en la dirección del canal
 * (youtube.com/channel/UC…) o en el código fuente de la página del canal, buscando "channelId".
 * Con `YOUTUBE_VIDEOS_OCULTOS` (identificadores separados por coma) se esconde alguno sin
 * quitarlo de YouTube.
 */

/** Canal de Omar Borboa: youtube.com/channel/UC4ACrnzVpjepmv3p-t1orMw. Sin canal no se lee nada. */
const CANAL_POR_OMISION = "UC4ACrnzVpjepmv3p-t1orMw";

/** Una hora: el canal publica varias veces por semana, no varias veces por minuto. */
const SEGUNDOS_DE_CACHE = 3600;

/**
 * Lo máximo que se hace esperar a un visitante por YouTube, **sumando todos los intentos**.
 *
 * Es un presupuesto único, no un plazo por petición: si el feed agota ocho segundos colgado, a
 * las pestañas ya no les queda nada y se sirve el respaldo. Con un plazo por petición, el que
 * tuviera la mala suerte de caer con YouTube colgado esperaría ocho segundos por el feed y otros
 * ocho por las pestañas, y en un teléfono en la calle eso es una página que no carga.
 */
const ESPERA_TOTAL_MS = 8000;

/** Lo que queda del presupuesto. El mínimo evita abortar en seco con un error que no explica nada. */
function restante(limite: number): number {
  return Math.max(500, limite - Date.now());
}

/**
 * Hasta cuántos días atrás un video largo sigue contando como "de ahora".
 *
 * Las dos pestañas del canal vienen cada una ordenada de lo más nuevo a lo más viejo, pero la de
 * Shorts no dice cuándo se publicó cada uno, así que no hay forma de intercalar las dos listas
 * por fecha. Se resuelve con lo que de hecho hace el canal: el día a día son Shorts, y un video
 * largo aparece de vez en cuando. Entonces los largos recientes encabezan, los Shorts siguen en
 * su orden, y los largos viejos solo rellenan si falta.
 */
const RECIENTE_EN_DIAS = 45;

/** Cuántos videos se leen del canal antes de recortar: deja margen para los ocultos. */
const LEER_DE_MAS = 24;

export type VideoDelCanal = {
  id: string;
  titulo: string;
  /** Fecha de publicación en ISO. Solo la da el canal RSS. */
  publicado?: string;
  /** "hace 2 semanas", tal cual lo escribe YouTube, cuando no hay fecha exacta. */
  antiguedad?: string;
  /** Vertical (Short) u horizontal. Cuando no se sabe, la tarjeta lo deduce de la miniatura. */
  formato?: "corto" | "horizontal";
};

export type VideosDeLaPagina = {
  videos: VideoDelCanal[];
  /** De dónde salieron: sirve para no anunciar "lo último" cuando en realidad es el respaldo. */
  fuente: "canal" | "respaldo";
};

// ───────────────────────────── Traer las páginas ─────────────────────────────

async function pedir(url: string, limite: number): Promise<string> {
  const respuesta = await fetch(url, {
    // La caché la lleva `leerDelCanal` sobre la lista ya leída; guardar aquí sería guardar más de
    // un megabyte de HTML para quedarnos con seis títulos.
    cache: "no-store",
    signal: AbortSignal.timeout(restante(limite)),
    headers: {
      // Sin navegador declarado, YouTube contesta una página distinta y sin los datos.
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      // Fija el idioma de los textos que se leen abajo ("hace 2 semanas").
      "accept-language": "es-MX,es;q=0.9",
      // Evita la pantalla de consentimiento que YouTube enseña a los servidores europeos.
      cookie: "CONSENT=YES+cb"
    }
  });
  if (!respuesta.ok) throw new Error(`${url} respondió ${respuesta.status}`);
  return respuesta.text();
}

// ─────────────────────────────── Leer el texto ───────────────────────────────

const ENTIDADES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'"
};

/** Texto de un XML: las entidades de HTML resueltas. */
function textoXml(valor: string): string {
  return valor
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z]+;|&#39;/gi, (e) => ENTIDADES[e.toLowerCase()] ?? e)
    .trim();
}

const ESCAPES: Record<string, string> = { n: "\n", r: "", t: " ", b: "", f: "" };

/** Texto de una cadena JSON: los `\uXXXX` y las barras invertidas resueltos. */
function textoJson(valor: string): string {
  return valor
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\(.)/g, (_, c: string) => ESCAPES[c] ?? c)
    .trim();
}

/** El contenido del elemento `<etiqueta>` dentro de un bloque de XML. */
function entre(bloque: string, etiqueta: string): string {
  const m = bloque.match(new RegExp(`<${etiqueta}>([\\s\\S]*?)</${etiqueta}>`));
  return m?.[1] ? textoXml(m[1]) : "";
}

/**
 * La cadena JSON que empieza justo después de `marca`.
 *
 * A mano y no con una expresión regular porque hay que respetar los escapes: un título con
 * comillas dentro trae `\"`, y ahí una expresión regular corta de más.
 */
function cadenaTras(bloque: string, marca: string): string {
  const inicio = bloque.indexOf(marca);
  if (inicio < 0) return "";
  const desde = inicio + marca.length;
  let i = desde;
  while (i < bloque.length) {
    if (bloque[i] === "\\") {
      i += 2;
      continue;
    }
    if (bloque[i] === '"') break;
    i += 1;
  }
  return textoJson(bloque.slice(desde, i));
}

// ───────────────────────────── 1. El canal RSS ─────────────────────────────

function delFeed(xml: string): VideoDelCanal[] {
  const videos: VideoDelCanal[] = [];
  for (const [, bloque] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = entre(bloque!, "yt:videoId");
    const titulo = entre(bloque!, "title");
    if (!id || !titulo) continue;
    const publicado = entre(bloque!, "published");
    videos.push(publicado ? { id, titulo, publicado } : { id, titulo });
  }
  return videos;
}

// ──────────────────────── 2. Las pestañas del canal ────────────────────────

/** Cada tarjeta de la pestaña "Videos" es un `lockupViewModel`. */
const MARCA_TITULO_LARGO = '"lockupMetadataViewModel":{"title":{"content":"';
const RE_ID_LARGO = /"contentId":"([A-Za-z0-9_-]{11})","contentType":"LOCKUP_CONTENT_TYPE_VIDEO"/;
/**
 * La antigüedad va junto a las vistas: "6 vistas" • "hace 2 semanas". Se exige el número para
 * no confundirla con un título que empiece por "hace".
 */
const RE_ANTIGUEDAD = /"content":"(hace \d+ [^"]{1,24}|\d+ [a-z]+ ago)"/;

/** Cada tarjeta de la pestaña "Shorts" es un `shortsLockupViewModel`, con otra forma. */
const MARCA_TITULO_CORTO = '"accessibilityText":"';
const RE_ID_CORTO = /"entityId":"shorts-shelf-item-([A-Za-z0-9_-]{11})"/;
/** Las palabras con las que YouTube nombra el conteo, en español y en inglés. */
const RE_CONTEO = /vistas|visualizaciones|views/i;

/**
 * El título de un Short, sin la cola que YouTube le pega.
 *
 * El texto accesible viene como "Título, 212 vistas - reproducir Short". Se corta por la última
 * coma cuya cola hable de vistas, en vez de describir con una expresión regular cómo escribe
 * YouTube el conteo: eso cambia con el idioma y con el tamaño del número —"212", "1.1 mil",
 * "3 millones **de** vistas"—, y la versión que enumeraba se dejaba fuera justo la de millones.
 *
 * Además así se evita el otro problema de aquella expresión: mezclaba `\s*` con `[\d.,]+\s*`,
 * que se solapan, y ante un título con muchas comas seguidas se disparaba el retroceso. Medido:
 * 1,600 comas tardaban 3.1 segundos, y eso bloquea el servidor entero para todos los visitantes,
 * porque Node corre en un solo hilo. Buscar la última coma es lineal.
 */
function tituloDeShort(texto: string): string {
  // Sin "Short" en la cola no es el formato conocido: más vale dejar el título entero que
  // recortarle algo que sí era suyo.
  if (!/short/i.test(texto)) return texto;
  const coma = texto.lastIndexOf(", ");
  if (coma <= 0) return texto;
  return RE_CONTEO.test(texto.slice(coma)) ? texto.slice(0, coma).trim() : texto;
}

/** Un video de la pestaña "Videos", con su antigüedad ya en días para poder ordenarlos. */
type Largo = { video: VideoDelCanal; dias: number };

const UNIDADES: Array<[RegExp, number]> = [
  [/segundo|second/, 0],
  [/minuto|minute/, 0],
  [/hora|hour/, 0],
  [/semana|week/, 7],
  [/d[ií]a|day/, 1],
  [/mes|month/, 30],
  [/a[nñ]o|year/, 365]
];

/** "hace 2 semanas" -> 14. Lo que no se entiende se trata como viejo, no como nuevo. */
function enDias(texto: string): number {
  if (!texto) return Number.POSITIVE_INFINITY;
  const cantidad = Number(texto.match(/\d+/)?.[0] ?? 1);
  for (const [unidad, dias] of UNIDADES) {
    if (unidad.test(texto)) return cantidad * dias;
  }
  return Number.POSITIVE_INFINITY;
}

function largosDeLaPestana(html: string): Largo[] {
  const videos: Largo[] = [];
  for (const bloque of html.split('"lockupViewModel":{').slice(1)) {
    const id = bloque.match(RE_ID_LARGO)?.[1];
    if (!id) continue;
    const titulo = cadenaTras(bloque, MARCA_TITULO_LARGO);
    if (!titulo) continue;
    const antiguedad = bloque.match(RE_ANTIGUEDAD)?.[1] ?? "";
    videos.push({
      video: { id, titulo, formato: "horizontal", ...(antiguedad ? { antiguedad } : {}) },
      dias: enDias(antiguedad)
    });
  }
  return videos;
}

function cortosDeLaPestana(html: string): VideoDelCanal[] {
  const videos: VideoDelCanal[] = [];
  for (const bloque of html.split('"shortsLockupViewModel":{').slice(1)) {
    const id = bloque.match(RE_ID_CORTO)?.[1];
    if (!id) continue;
    const titulo = tituloDeShort(cadenaTras(bloque, MARCA_TITULO_CORTO));
    if (!titulo) continue;
    videos.push({ id, titulo, formato: "corto" });
  }
  return videos;
}

/**
 * Las dos pestañas ya descargadas, convertidas en una sola lista ordenada.
 *
 * Se deja aparte de la descarga —y exportada— porque es la parte con criterio: qué se considera
 * reciente y en qué orden quedan las dos listas. Así se prueba sin tocar la red.
 */
export function mezclarPestanas(htmlDeVideos: string, htmlDeShorts: string): VideoDelCanal[] {
  const largos = largosDeLaPestana(htmlDeVideos);
  const cortos = cortosDeLaPestana(htmlDeShorts);

  const recientes = largos.filter((l) => l.dias <= RECIENTE_EN_DIAS).map((l) => l.video);
  const viejos = largos.filter((l) => l.dias > RECIENTE_EN_DIAS).map((l) => l.video);
  return [...recientes, ...cortos, ...viejos];
}

async function deLasPestanas(canal: string, limite: number): Promise<VideoDelCanal[]> {
  const base = `https://www.youtube.com/channel/${encodeURIComponent(canal)}`;
  // Si una de las dos pestañas falla, la otra basta para no dejar la página sin videos.
  const [htmlDeVideos, htmlDeShorts] = await Promise.all([
    pedir(`${base}/videos`, limite).catch(fallo("la pestaña de videos")),
    pedir(`${base}/shorts`, limite).catch(fallo("la pestaña de Shorts"))
  ]);
  return mezclarPestanas(htmlDeVideos, htmlDeShorts);
}

function fallo(que: string) {
  return (error: unknown): string => {
    console.warn(`No se pudo leer ${que} del canal:`, error);
    return "";
  };
}

// ─────────────────────────────── Lo que se usa ───────────────────────────────

/**
 * La lista del canal, guardada una hora. Se guarda aquí —y no en cada `fetch`— para que lo
 * que ocupe la caché sean los títulos y no el megabyte de HTML del que salieron.
 */
const leerDelCanal = unstable_cache(
  async (canal: string): Promise<VideoDelCanal[]> => {
    // Un solo reloj para los dos caminos: lo que gaste el feed se lo quita a las pestañas.
    const limite = Date.now() + ESPERA_TOTAL_MS;

    try {
      const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(canal)}`;
      const videos = delFeed(await pedir(url, limite));
      if (videos.length > 0) return videos.slice(0, LEER_DE_MAS);
    } catch (error) {
      // Que no haya feed es lo normal en varios canales —el de la campaña entre ellos—, así que
      // se anota en una línea y se sigue por las pestañas, que además son de donde salen los
      // Shorts. Nada de volcar el rastro de la pila por algo que se espera.
      const motivo = error instanceof Error ? error.message : String(error);
      console.warn(`Sin feed RSS en el canal ${canal} (${motivo}); se leen las pestañas del canal.`);
    }

    const videos = await deLasPestanas(canal, limite);
    return videos.slice(0, LEER_DE_MAS);
  },
  ["videos-del-canal"],
  { revalidate: SEGUNDOS_DE_CACHE, tags: ["videos-canal"] }
);

export async function videosDelCanal(limite: number, respaldo: VideoDelCanal[]): Promise<VideosDeLaPagina> {
  const canal = process.env.YOUTUBE_CANAL_ID?.trim() || CANAL_POR_OMISION;
  if (!canal) return { videos: [], fuente: 'respaldo' };
  const ocultos = new Set(
    (process.env.YOUTUBE_VIDEOS_OCULTOS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );

  const recortar = (lista: VideoDelCanal[]): VideoDelCanal[] => {
    const vistos = new Set<string>();
    const salida: VideoDelCanal[] = [];
    for (const v of lista) {
      if (ocultos.has(v.id) || vistos.has(v.id)) continue;
      vistos.add(v.id);
      salida.push(v);
      if (salida.length >= limite) break;
    }
    return salida;
  };

  try {
    const videos = recortar(await leerDelCanal(canal));
    if (videos.length > 0) return { videos, fuente: "canal" };
  } catch (error) {
    // No se rompe la página por esto: es material de campaña que se abre en la calle.
    console.warn("No se pudieron leer los videos del canal; se usa la lista de respaldo:", error);
  }

  return { videos: recortar(respaldo), fuente: "respaldo" };
}
