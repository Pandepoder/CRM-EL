import { redirect } from "next/navigation";

import { getHomePathForRole } from "@tonala/ui";

import { eq } from "drizzle-orm";

import { schema } from "@tonala/shared/database";

import { actorFromSession } from "@/lib/api-helpers";
import { getDatabaseClient } from "@/lib/db-client";
import { destroyServerSession, getServerSession } from "@/lib/session-server";

/**
 * Salida para una sesión cuya cuenta ya no está activa (dada de baja, rechazada o borrada).
 *
 * Sin esta ruta, quien tenía la sesión abierta cuando administración le daba de baja caía en un
 * bucle infinito de redirecciones: la guarda de la pantalla lo mandaba a /login, y el middleware,
 * que solo ve la cookie, lo devolvía a su inicio. Comprobado:
 * `/crm/contacts → /login → /crm/contacts → …`. En el teléfono eso es la página de error del
 * navegador ("demasiadas redirecciones"), sin explicación y sin forma de volver a entrar hasta
 * borrar las cookies. Las guardas mandan aquí en su lugar.
 *
 * Es GET porque llega por redirección. Para que un enlace ajeno no sirva para desconectar a
 * nadie, solo cierra la sesión si la cuenta de verdad ya no está activa; con una cuenta activa
 * devuelve a su inicio sin tocar nada. `actorFromSession` devuelve null únicamente cuando la
 * cuenta no existe o no está activa: si la base no responde, lanza, así que una caída no cierra
 * la sesión de nadie.
 */
export async function GET() {
  const actor = await actorFromSession();
  if (actor) {
    redirect(getHomePathForRole(actor.roles[0] ?? ""));
  }

  // La cuenta sigue activa pero la sesión es de antes de un cambio de rol, municipio o contraseña
  // (0023): se dice eso, no «tu cuenta ya no está activa».
  const sesion = await getServerSession();
  const [cuenta] = sesion.userId
    ? await getDatabaseClient()
        .select({ status: schema.userProfiles.status })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.id, sesion.userId))
        .limit(1)
    : [];

  await destroyServerSession();
  redirect(cuenta?.status === "active" ? "/login?motivo=sesion-cerrada" : "/login?motivo=cuenta-inactiva");
}
