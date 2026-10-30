import { and, desc, eq, isNull } from "drizzle-orm";
import { schema } from "@tonala/shared/database";

import type { MiAviso } from "./avisos-de-campo";
import { getDatabaseClient } from "./db-client";

/** Los avisos de una persona, los más nuevos primero. Solo los suyos: es lo que levantó ella. */
export async function misAvisos(userId: string, limite = 20): Promise<MiAviso[]> {
  const filas = await getDatabaseClient()
    .select({
      id: schema.eventReports.id,
      titulo: schema.eventReports.title,
      categoria: schema.eventReports.category,
      estado: schema.eventReports.status,
      motivo: schema.eventReports.cancelReason,
      creado: schema.eventReports.createdAt
    })
    .from(schema.eventReports)
    .where(and(eq(schema.eventReports.createdByUserId, userId), isNull(schema.eventReports.activityTypeId)))
    .orderBy(desc(schema.eventReports.createdAt))
    .limit(limite);
  return filas.map((f) => ({ ...f, creado: f.creado.toISOString() }));
}
