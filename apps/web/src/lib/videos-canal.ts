/**
 * Últimos videos publicados en el canal de YouTube.
 *
 * La página "Conóceme" traía los videos escritos a mano: cada video nuevo obligaba a pegar su
 * identificador en el código y volver a desplegar, así que la página se quedaba meses atrás del
 * canal. Ahora se leen del canal mismo.
 *
 * Se usa el canal RSS que YouTube publica abierto (`/feeds/videos.xml`): no necesita llave de
 * API ni cuenta de Google, trae los 15 videos más recientes y aguanta cualquier cantidad de
 * visitas porque la respuesta se guarda una hora (`revalidate`). Si el canal no responde —el
 * servidor sin salida a internet, YouTube caído— la página no se queda vacía: se devuelve la
 * lista de respaldo que se le pase.
 *
 * Para cambiar de canal no hace falta tocar código: `YOUTUBE_CANAL_ID` en el entorno. El
 * identificador es el que empieza con `UC`; se ve en la dirección del canal
 * (youtube.com/channel/UC…) o en el código fuente de la página del canal, buscando "channelId".
 * Con `YOUTUBE_VIDEOS_OCULTOS` (identificadores separados por coma) se esconde alguno sin
 * quitarlo de YouTube.
 */

/** Canal de la campaña: youtube.com/@edgarlopezj */
const CANAL_POR_OMISION = "UCPLZp6cBPcMYWbX7uuarkbw";

/** Una hora: el canal publica varias veces por semana, no varias veces por minuto. */
const SEGUNDOS_DE_CACHE = 3600;

/** Si YouTube tarda más que esto, se sirve la página con el respaldo en vez de hacer esperar. */
const ESPERA_MAXIMA_MS = 6000;

export type VideoDelCanal = {
  id: string;
  titulo: string;
  /** Fecha de publicación en ISO, tal como la da el canal. */
  publicado?: string;
};

export type VideosDeLaPagina = {
  videos: VideoDelCanal[];
  /** De dónde salieron: sirve para no anunciar "lo último" cuando en realidad es el respaldo. */
  fuente: "canal" | "respaldo";
};

const entidades: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'"
};

function textoLimpio(valor: string): string {
  return valor
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z]+;|&#39;/gi, (e) => entidades[e.toLowerCase()] ?? e)
    .trim();
}

function entre(bloque: string, etiqueta: string): string {
  const m = bloque.match(new RegExp(`<${etiqueta}>([\\s\\S]*?)</${etiqueta}>`));
  return m?.[1] ? textoLimpio(m[1]) : "";
}

export async function videosDelCanal(limite: number, respaldo: VideoDelCanal[]): Promise<VideosDeLaPagina> {
  const canal = process.env.YOUTUBE_CANAL_ID?.trim() || CANAL_POR_OMISION;
  const ocultos = new Set(
    (process.env.YOUTUBE_VIDEOS_OCULTOS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );

  try {
    const respuesta = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(canal)}`, {
      next: { revalidate: SEGUNDOS_DE_CACHE },
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS)
    });
    if (!respuesta.ok) throw new Error(`YouTube respondió ${respuesta.status}`);

    const xml = await respuesta.text();
    const videos: VideoDelCanal[] = [];
    for (const [, bloque] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
      const id = entre(bloque!, "yt:videoId");
      const titulo = entre(bloque!, "title");
      if (!id || ocultos.has(id) || videos.some((v) => v.id === id)) continue;
      const publicado = entre(bloque!, "published");
      videos.push(publicado ? { id, titulo, publicado } : { id, titulo });
      if (videos.length >= limite) break;
    }

    if (videos.length === 0) throw new Error("El canal no devolvió videos");
    return { videos, fuente: "canal" };
  } catch (error) {
    // No se rompe la página por esto: es material de campaña que se abre en la calle.
    console.warn("No se pudieron leer los videos del canal; se usa la lista de respaldo:", error);
    return { videos: respaldo.filter((v) => !ocultos.has(v.id)).slice(0, limite), fuente: "respaldo" };
  }
}
