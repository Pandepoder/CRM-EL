import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { DevelopmentLogger } from "@tonala/shared/observability";
import { getSectionStats } from "@tonala/modules/territory/application";

import { createTerritoryMutationsDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { actorFromSession, permissionChecker, unauthorized } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { visibleContactIds, sqlRestriccionContactos } from "@/lib/contact-visibility";

export async function GET(request: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { searchParams } = new URL(request.url);
  const sectionNumStr = searchParams.get("sectionNum");

  if (!sectionNumStr) {
    return NextResponse.json({ error: "Missing sectionNum" }, { status: 400 });
  }

  const sectionNum = parseInt(sectionNumStr, 10);
  if (isNaN(sectionNum)) {
    return NextResponse.json({ error: "Invalid sectionNum" }, { status: 400 });
  }

  const db = getDatabaseClient();
  const deps = await createTerritoryMutationsDependencies(db);

  const result = await getSectionStats(actor, { sectionNum }, {
    territoryReader: deps.territoryReader,
    logger: new DevelopmentLogger(),
    permissionChecker
  });

  if (!result.ok) {
    if (result.error.code === "permission_denied") {
      return unauthorized();
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  // Al tocar una sección en el mapa, cualquiera recibía cuánta gente tiene registrada ahí la
  // estructura y cuántas visitas lleva: el trabajo de otras brigadas, sección por sección. Las
  // colonias sí son cartografía pública y se conservan; los números se recalculan sobre los
  // contactos del alcance de quien pregunta.
  const alcance = await resolveUserNetworkScope(actor.actorId);
  const contactosVisibles = await visibleContactIds(alcance);
  if (contactosVisibles === null) return NextResponse.json(result.value);

  return NextResponse.json({ ...result.value, ...(await conteosDeSeccion(sectionNum, contactosVisibles)) });
}

/**
 * Los mismos conteos que hace el lector de territorio, pero acotados a una lista de contactos.
 * Se repiten aquí porque el lector vive en packages/modules y su firma no recibe esa lista;
 * cuando la reciba, esta consulta sobra.
 */
async function conteosDeSeccion(sectionNum: number, contactosVisibles: string[]) {
  const filtro = sqlRestriccionContactos(sql.raw("ct.contact_id"), contactosVisibles);
  const resultado = await getDatabaseClient().execute<{
    contact_count: string;
    visit_scheduled_count: string;
    visit_completed_count: string;
  }>(sql`
    SELECT
      COUNT(DISTINCT ct.contact_id)::text AS contact_count,
      COUNT(DISTINCT CASE WHEN v.status = 'scheduled' THEN v.id END)::text AS visit_scheduled_count,
      COUNT(DISTINCT CASE WHEN v.status = 'completed' THEN v.id END)::text AS visit_completed_count
    FROM electoral_sections es
    LEFT JOIN section_colonies sc ON sc.section_id = es.id
    LEFT JOIN colonies col ON col.id = sc.colony_id AND col.status = 'active'
    LEFT JOIN contact_territory ct ON ct.colony_id = col.id AND ct.territory_status = 'confirmed' ${filtro}
    LEFT JOIN visits v ON v.contact_id = ct.contact_id
    WHERE es.section_num = ${sectionNum}
    GROUP BY es.section_num
    LIMIT 1
  `);

  const fila = resultado.rows[0];
  return {
    contactCount: Number(fila?.contact_count ?? 0),
    visitScheduledCount: Number(fila?.visit_scheduled_count ?? 0),
    visitCompletedCount: Number(fila?.visit_completed_count ?? 0)
  };
}
