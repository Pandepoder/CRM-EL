/**
 * Identidad pública del sistema, en un solo sitio.
 *
 * La persona que impulsa el proyecto, su eslogan, foto, reel, redes y logotipo viven aquí para
 * cambiarlos sin tocar cada página. Lo que no se tiene (foto, reel, canal de YouTube) va en `null`:
 * las páginas no dibujan esa pieza en lugar de mostrar material de otra persona.
 *
 * Desde el 2026-09-27, otra vez Edgar López (pedido del dueño), con su eslogan, «Un Jalisco Posible»,
 * su logotipo EL, retrato, reel, redes y canal, como estaba antes del cambio a Omar Borboa (#23).
 */
export const MARCA = {
  /** El nombre del sistema (pestaña, barra lateral). */
  sistema: "Jalisco OS",
  descriptor: "Gestor de campaña",
  /** Quien firma las páginas públicas: encabezados, bienvenida y pies de página. */
  firma: "Edgar López",
  /**
   * El eslogan de las páginas públicas, en las partes con que se dibuja: el principio, una parte en
   * tono suave y el final resaltado. `comillas`: si va entre comillas.
   */
  eslogan: { inicio: "Si pasa por tu mente,", suave: "pasa por", acento: "tu vida.", comillas: true },
  lema: "Un Jalisco Posible",
  referente: {
    nombre: "Edgar López",
    corto: "Edgar López",
    /** Para «Ver videos y conocer a …». */
    nombrePila: "Edgar",
    /** Sin cargo, no se escribe ninguno. */
    cargo: null as string | null
  },
  /** La página pública habla en primera persona («Conoce mi trabajo») o en tercera («Conoce su trabajo»). */
  primeraPersona: true,
  redes: {
    instagram: "https://www.instagram.com/edgar_lopezj",
    facebook: "https://www.facebook.com/share/14khJUZf2aw/",
    youtube: "https://youtube.com/@edgarlopezj" as string | null
  },
  /** Ruta bajo /public. Sin foto aprobada se deja `null` y no se muestra retrato. */
  retrato: "/media/edgar-retrato.jpg" as string | null,
  reel: { src: "/media/edgar-reel-1.mp4", poster: "/media/edgar-frame-3s.jpg" } as { src: string; poster: string } | null,
  /** El logotipo, en blanco (sobre fondo oscuro) y a color. El genérico es /brand/monograma-*.svg. */
  monograma: { blanco: "/brand/el-monograma-blanco.png", color: "/brand/el-monograma-color.png" }
} as const;

/** El eslogan en una sola línea de texto (para lectores de pantalla y metadatos). */
export const ESLOGAN_EN_TEXTO = `${MARCA.eslogan.inicio} ${MARCA.eslogan.suave} ${MARCA.eslogan.acento}`;

/** Un eslogan largo se dibuja más chico para que quepa en dos renglones. */
export const ESLOGAN_ES_LARGO = ESLOGAN_EN_TEXTO.length > 20;
