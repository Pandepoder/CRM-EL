import type { Metadata, Viewport } from "next";

import "./globals.css";
import "./workspace-design.css";
import { InterfaceMotion } from "@/components/InterfaceMotion";

export const metadata: Metadata = {
  title: "Tonala OS",
  description: "Sistema operativo territorial"
};

/**
 * `viewportFit: "cover"` es lo que hace que `env(safe-area-inset-*)` devuelva
 * algo distinto de cero en iPhone.
 *
 * Sin esto, el viewport por defecto de Next no lo activaba y esas variables
 * valian cero. El CSS las usa en cinco sitios —la barra inferior de navegacion,
 * el relleno del contenido y el boton flotante—, asi que en todo iPhone con
 * barra de gestos la navegacion quedaba por debajo del indicador de inicio: los
 * botones se tapaban y costaba acertarles.
 *
 * `themeColor` tine la barra del navegador en Android con el azul de campana.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1f3a"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body><InterfaceMotion />{children}</body>
    </html>
  );
}
