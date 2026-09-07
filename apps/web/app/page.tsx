import { redirect } from "next/navigation";

import { getHomePathForRole } from "@tonala/ui";

import { getServerSession } from "@/lib/session-server";

/**
 * Puerta de entrada pública.
 *
 * Quien llega a elapp.com.mx sin sesión —desde un QR, desde un enlace de
 * WhatsApp o escribiendo el dominio— aterriza directamente en Conóceme, que es
 * el material de campaña. Antes veía una portada que hablaba de la plataforma:
 * útil para quien va a trabajar, irrelevante para un ciudadano en la puerta de
 * su casa, que es la mayoría de quienes abren este enlace.
 *
 * Conóceme lleva su propio acceso a "Iniciar sesión" en la cabecera, así que la
 * estructura no pierde el camino de entrada; solo deja de ser lo primero.
 *
 * La portada anterior sigue en el historial de git, en el commit que introdujo
 * este cambio, por si se quisiera recuperar como página aparte.
 */
export default async function HomePage() {
  const session = await getServerSession();

  // Quien ya trabaja aquí va a su panel, no al material de campaña.
  if (session.isLoggedIn) {
    redirect(getHomePathForRole(session.roleKey));
  }

  redirect("/conoceme");
}
