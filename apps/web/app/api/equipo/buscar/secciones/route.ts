import { NextResponse } from "next/server";
import { schema } from "@tonala/shared/database";
import { and, asc, eq, sql } from "drizzle-orm";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { getDatabaseClient } from "@/lib/db-client";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TAMANO_MAX = 30;

/**
 * Busca secciones electorales por número (o por el comienzo del número), con paginación. Son un
 * catálogo oficial: no se crean desde la bitácora, se eligen de las que existen. El selector
 * cargaba solo las 100 primeras y el resto parecía no existir.
 */
export async function GET(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").replace(/\D/g, "");
  const pagina = Math.max(1, Number(url.searchParams.get("pagina")) || 1);
  const tamano = Math.min(TAMANO_MAX, Math.max(1, Number(url.searchParams.get("limite")) || 15));
  const idCrudo = url.searchParams.get("id");
  // Un id mal formado no llega a la base: se trata como "nada que devolver".
  if (idCrudo && !UUID.test(idCrudo)) return NextResponse.json({ resultados: [], hayMas: false, pagina: 1 });
  const id = idCrudo;
  const municipio = (url.searchParams.get("municipio") ?? "").trim();

  const db = getDatabaseClient();
  const filas = await db
    .select({
      id: schema.electoralSections.id,
      sectionNum: schema.electoralSections.sectionNum,
      municipality: schema.electoralSections.municipality
    })
    .from(schema.electoralSections)
    .where(
      and(
        id ? eq(schema.electoralSections.id, id) : undefined,
        q ? sql`${schema.electoralSections.sectionNum}::text LIKE ${`${q}%`}` : undefined,
        municipio ? eq(schema.electoralSections.municipality, municipio) : undefined
      )
    )
    .orderBy(asc(schema.electoralSections.sectionNum))
    .limit(tamano + 1)
    .offset((pagina - 1) * tamano);

  return NextResponse.json({
    resultados: filas.slice(0, tamano).map((s) => ({
      id: s.id,
      nombre: `Sección ${s.sectionNum}`,
      detalle: s.municipality
    })),
    hayMas: filas.length > tamano,
    pagina
  });
}
