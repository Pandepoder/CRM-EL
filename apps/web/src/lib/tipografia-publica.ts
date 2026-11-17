import localFont from "next/font/local";

/**
 * La letra de las páginas públicas (bienvenida, acceso y solicitar acceso).
 *
 * Va en el repositorio y no se pide a Google: compilar no depende de tener salida a internet y quien
 * abre la página no le avisa a nadie más. Un solo archivo trae todos los pesos y los acentos del español,
 * y solo se descarga en estas páginas: el panel sigue con la letra del sistema.
 */
export const tipografiaPublica = localFont({
  src: "../fonts/figtree-latin-wght-normal.woff2",
  weight: "300 900",
  display: "swap",
  fallback: ["Segoe UI", "Roboto", "Arial", "sans-serif"]
});
