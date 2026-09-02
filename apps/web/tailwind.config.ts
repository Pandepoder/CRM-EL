import type { Config } from "tailwindcss";

// El marcado de la app se escribió con utilidades de Tailwind v3 pero durante
// meses no hubo Tailwind instalado: un shim hecho a mano cubría ~39% de las
// clases y el resto no hacía nada. Este config restituye el generador real.
// `important` mantiene la prioridad que el shim conseguía con !important, para
// que las utilidades sigan ganando a las reglas de componente de globals.css.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/**/*.{ts,tsx}"
  ],
  important: true,
  theme: {
    extend: {}
  },
  plugins: []
};

export default config;
