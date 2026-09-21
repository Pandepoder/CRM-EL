import { NextResponse } from "next/server";
import { decryptData, schema } from "@tonala/shared/database";
import { and, asc, eq, ilike, or } from "drizzle-orm";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { contactIdRestriction, visibleContactIds } from "@/lib/contact-visibility";
import { getDatabaseClient } from "@/lib/db-client";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TAMANO_MAX = 30;

/**
 * Busca entre TODOS los contactos que la persona puede ver, con paginación. El selector de la
 * bitácora cargaba los primeros 100 por orden alfabético: el contacto 101 no existía para quien
 * lo buscaba, y "no aparece" se confundía con "no está registrado".
 *
 * El alcance es el mismo que gobierna el directorio y la ficha (`visibleContactIds`).
 */
export async function GET(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const pagina = Math.max(1, Number(url.searchParams.get("pagina")) || 1);
  const tamano = Math.min(TAMANO_MAX, Math.max(1, Number(url.searchParams.get("limite")) || 15));
  const idCrudo = url.searchParams.get("id");
  // Un id mal formado no llega a la base: se trata como "nada que devolver".
  if (idCrudo && !UUID.test(idCrudo)) return NextResponse.json({ resultados: [], hayMas: false, pagina: 1 });
  const id = idCrudo;

  const alcance = await resolveUserNetworkScope(actor.actorId);
  const restriccion = contactIdRestriction(await visibleContactIds(alcance));
  const comodin = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

  const db = getDatabaseClient();
  const filas = await db
    .select({ id: schema.contacts.id, displayName: schema.contacts.displayName, colony: schema.contacts.colony })
    .from(schema.contacts)
    .where(
      and(
        eq(schema.contacts.status, "active"),
        restriccion,
        id ? eq(schema.contacts.id, id) : undefined,
        q ? or(ilike(schema.contacts.displayName, comodin)) : undefined
      )
    )
    .orderBy(asc(schema.contacts.displayName), asc(schema.contacts.id))
    .limit(tamano + 1)
    .offset((pagina - 1) * tamano);

  return NextResponse.json({
    resultados: filas.slice(0, tamano).map((c) => ({
      id: c.id,
      nombre: c.displayName,
      detalle: decryptData(c.colony) || null
    })),
    hayMas: filas.length > tamano,
    pagina
  });
}
