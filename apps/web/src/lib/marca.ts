/**
 * Identidad pública del sistema, en un solo sitio.
 *
 * El sistema es genérico ("Jalisco OS"); la referencia a la persona que lo impulsa es sutil y vive
 * aquí para cambiarla sin tocar cada página. Lo que todavía no se tiene (foto, reel, canal de
 * YouTube) va en `null`: las páginas no dibujan esa pieza en lugar de mostrar material de otra
 * persona.
 */
export const MARCA = {
  sistema: "Jalisco OS",
  descriptor: "Gestor de campaña",
  /** El eslogan que encabeza las páginas públicas. */
  eslogan: "¿Y si sí?",
  lema: "Territorio, gente y resultados",
  referente: {
    nombre: "Omar Borboa Becerra",
    corto: "Omar Borboa",
    cargo: "Diputado federal · PAN",
    /** Para frases corridas (pie de página): las siglas no se pasan a minúsculas. */
    cargoTexto: "diputado federal del PAN"
  },
  redes: {
    instagram: "https://www.instagram.com/omarborboaoficial/",
    facebook: "https://www.facebook.com/people/Omar-Borboa/100009421625988/",
    youtube: "https://www.youtube.com/channel/UC4ACrnzVpjepmv3p-t1orMw" as string | null
  },
  /** Ruta bajo /public. Sin foto aprobada se deja `null` y no se muestra retrato. */
  retrato: "/media/omar-retrato.jpg" as string | null,
  reel: null as { src: string; poster: string } | null
} as const;
