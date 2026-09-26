import { NextResponse } from "next/server";
import { actorFromSession } from "@/lib/api-helpers";
import { motivoSiAdjuntosAjenos } from "@/lib/archivos";
import { getServerSession, saveServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { validarDomicilioDePersona } from "@/lib/domicilio-persona";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";

/**
 * Datos propios: el nombre, la foto de perfil (3.6) y el domicilio (0025). Cada quien cambia solo los
 * suyos.
 */
export async function PATCH(request: Request) {
  // La autorización sale de la base (cuenta activa); la cookie solo se lee para reescribir el
  // nombre que guarda. Con la cookie sola, una cuenta dada de baja seguía renombrándose.
  const actor = await actorFromSession();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let cuerpo: { displayName?: unknown; photoUrl?: unknown; homeAddress?: unknown; homeColony?: unknown; homeMunicipality?: unknown };
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }

  const cambios: Partial<typeof schema.userProfiles.$inferInsert> = {};

  if (cuerpo.displayName !== undefined) {
    if (typeof cuerpo.displayName !== "string" || cuerpo.displayName.trim() === "") {
      return NextResponse.json({ error: "Nombre no válido" }, { status: 400 });
    }
    cambios.displayName = cuerpo.displayName.trim();
  }

  if (cuerpo.photoUrl !== undefined) {
    if (cuerpo.photoUrl === null || cuerpo.photoUrl === "") {
      cambios.photoUrl = null;
    } else if (typeof cuerpo.photoUrl !== "string") {
      return NextResponse.json({ error: "Foto no válida." }, { status: 400 });
    } else {
      // Una foto que subió la propia persona, y que sea foto. La de perfil la ve cualquier sesión:
      // con la URL de una foto ajena —la de una incidencia, por ejemplo— esa foto quedaría a la
      // vista de todos (A12, `lib/archivos.ts`).
      const motivo = await motivoSiAdjuntosAjenos(actor.actorId, [cuerpo.photoUrl], [], { soloImagenes: true });
      if (motivo) return NextResponse.json({ error: motivo, campo: "photoUrl" }, { status: 400 });
      cambios.photoUrl = cuerpo.photoUrl;
    }
  }

  // El domicilio va completo —calle, colonia y municipio—, con la misma validación que al registrarse.
  if (cuerpo.homeAddress !== undefined || cuerpo.homeColony !== undefined || cuerpo.homeMunicipality !== undefined) {
    const domicilio = validarDomicilioDePersona(cuerpo);
    if (!domicilio.ok) return NextResponse.json({ error: domicilio.error, campo: domicilio.campo }, { status: 400 });
    Object.assign(cambios, domicilio.domicilio);
  }

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: "No hay nada que cambiar." }, { status: 400 });
  }

  const db = getDatabaseClient();
  await db.update(schema.userProfiles)
    .set({ ...cambios, updatedAt: new Date() })
    .where(eq(schema.userProfiles.id, actor.actorId));

  if (cambios.displayName) {
    const session = await getServerSession();
    await saveServerSession({ ...session, displayName: cambios.displayName });
  }

  return NextResponse.json({ success: true, displayName: cambios.displayName, photoUrl: cambios.photoUrl });
}
