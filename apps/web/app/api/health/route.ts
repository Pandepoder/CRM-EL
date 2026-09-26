import { NextResponse } from "next/server";

import { actorFromSession } from "@/lib/api-helpers";
import { revisarSistema } from "@/lib/estado-del-sistema";

export const dynamic = "force-dynamic";

/**
 * Estado de la aplicación.
 *
 * Antes solo hacía `SELECT 1`: con la base dos migraciones por detrás del código respondía "ok"
 * mientras `/resumen` se caía con un 500. Ahora compara el esquema que espera el código con el de
 * la base, y revisa el outbox, la huella del teléfono, el índice de correo y el cifrado.
 *
 * El contrato público NO cambia, porque dependen de él el healthcheck del contenedor
 * (`docker-compose.yml`: solo mira el código HTTP), el despliegue (`.github/workflows/deploy.yml`
 * busca literalmente `"status":"ok"`) y `scripts/qa-suite.ts`:
 *   - 200 y `"status":"ok"` si la aplicación puede servir, aunque haya avisos;
 *   - 503 y `"status":"error"` si la base no responde o faltan migraciones.
 * Si un aviso menor —un evento fallido del outbox— cambiara `status`, el despliegue se daría por
 * fallido sin motivo. Los avisos van aparte, en `degradado`.
 *
 * La ruta es pública (el middleware la deja pasar sin sesión), así que el detalle —nombres de
 * migraciones, conteos del outbox y del cifrado— solo se entrega con sesión de administración.
 */
export async function GET() {
  const estado = await revisarSistema();
  const sirve = estado.estado !== "error";

  const publico = {
    status: sirve ? "ok" : "error",
    degradado: estado.estado === "degradado",
    timestamp: new Date().toISOString()
  };

  // Con la base caída `actorFromSession` lanza; aquí eso solo significa "sin detalle".
  const actor = await actorFromSession().catch(() => null);
  const conDetalle = actor?.roles.includes("admin") ?? false;

  return NextResponse.json(conDetalle ? { ...publico, detalle: estado } : publico, {
    status: sirve ? 200 : 503,
    headers: { "Cache-Control": "no-store" }
  });
}
