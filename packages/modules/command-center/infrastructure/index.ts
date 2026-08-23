import { sql, type SQL } from "drizzle-orm";

import { type Database } from "@tonala/shared/database";
import { type ProjectionTransactionContext } from "@tonala/shared/projections";

import { type WalkingSkeletonProjectionSnapshot } from "../contracts/index.js";
import { type WalkingSkeletonProjectionWriter } from "../projections/index.js";

export const commandCenterInfrastructureName = "command-center-infrastructure";

type QueryResult<TRow> = { readonly rows: TRow[] };
type DrizzleExecutor = {
  execute<TRow extends Record<string, unknown>>(query: SQL): Promise<QueryResult<TRow>>;
};
type DrizzleProjectionTransactionContext = ProjectionTransactionContext & Readonly<{ client: DrizzleExecutor }>;

function executorFrom(tx: ProjectionTransactionContext): DrizzleExecutor {
  const candidate = tx as Partial<DrizzleProjectionTransactionContext>;
  if (!candidate.client) throw new Error("Projection transaction context does not contain a Drizzle executor");
  return candidate.client;
}

export class DrizzleWalkingSkeletonProjectionWriter implements WalkingSkeletonProjectionWriter {
  public constructor(private readonly tx: ProjectionTransactionContext) {}

  public incrementContactRegistered(eventCreatedAt: Date): Promise<void> {
    return this.increment("contact_registered_count", eventCreatedAt);
  }

  public incrementContactLinked(eventCreatedAt: Date): Promise<void> {
    return this.increment("contact_linked_count", eventCreatedAt);
  }

  public incrementResponsibleAssigned(eventCreatedAt: Date): Promise<void> {
    return this.increment("responsible_assigned_count", eventCreatedAt);
  }

  public incrementVisitScheduled(eventCreatedAt: Date): Promise<void> {
    return this.increment("visit_scheduled_count", eventCreatedAt);
  }

  public incrementVisitCompleted(eventCreatedAt: Date): Promise<void> {
    return this.increment("visit_completed_count", eventCreatedAt);
  }

  private async increment(columnName: WalkingSkeletonCounterColumn, eventCreatedAt: Date): Promise<void> {
    await ensureGlobalRow(executorFrom(this.tx));
    await executorFrom(this.tx).execute(sql`
      UPDATE walking_skeleton_projection_v1
      SET ${sql.raw(columnName)} = ${sql.raw(columnName)} + 1,
          last_event_at = GREATEST(COALESCE(last_event_at, ${eventCreatedAt.toISOString()}::timestamptz), ${eventCreatedAt.toISOString()}::timestamptz),
          version = version + 1,
          updated_at = now()
      WHERE projection_key = 'global'
    `);
  }
}

export class DrizzleWalkingSkeletonProjectionReader {
  public constructor(private readonly db: Database) {}

  public async getSnapshot(): Promise<WalkingSkeletonProjectionSnapshot | null> {
    const result = await this.db.execute<{
      projection_key: "global";
      contact_registered_count: number;
      contact_linked_count: number;
      responsible_assigned_count: number;
      visit_scheduled_count: number;
      visit_completed_count: number;
      last_event_at: Date | string | null;
      version: number;
    }>(sql`
      SELECT
        projection_key,
        contact_registered_count,
        contact_linked_count,
        responsible_assigned_count,
        visit_scheduled_count,
        visit_completed_count,
        last_event_at,
        version
      FROM walking_skeleton_projection_v1
      WHERE projection_key = 'global'
      LIMIT 1
    `);
    const row = result.rows[0];
    return row
      ? {
        projectionKey: row.projection_key,
        contactRegisteredCount: row.contact_registered_count,
        contactLinkedCount: row.contact_linked_count,
        responsibleAssignedCount: row.responsible_assigned_count,
        visitScheduledCount: row.visit_scheduled_count,
        visitCompletedCount: row.visit_completed_count,
        lastEventAt: row.last_event_at ? new Date(row.last_event_at).toISOString() : null,
        version: row.version
      }
      : null;
  }
}

type WalkingSkeletonCounterColumn =
  | "contact_registered_count"
  | "contact_linked_count"
  | "responsible_assigned_count"
  | "visit_scheduled_count"
  | "visit_completed_count";

async function ensureGlobalRow(executor: DrizzleExecutor): Promise<void> {
  await executor.execute(sql`
    INSERT INTO walking_skeleton_projection_v1 (projection_key)
    VALUES ('global')
    ON CONFLICT (projection_key) DO NOTHING
  `);
}
export { createOperationalSummaryReader } from './operational-summary-factory.js';
