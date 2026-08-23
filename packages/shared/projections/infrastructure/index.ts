import { sql, type SQL } from "drizzle-orm";

import { type Database } from "@tonala/shared/database";
import { err, ok } from "@tonala/shared/kernel";

import {
  createProjectionIdentity,
  createProjectionName,
  createProjectionVersion,
  type ProjectionEventReceiptInput,
  type ProjectionEventReceiptRepository,
  type ProjectionIdentity,
  projectionIdentityKey,
  type ProjectionRebuildReceiptInput,
  type ProjectionRebuildReceiptRepository,
  type ProjectionReceiptInsertResult,
  ProjectionStateConcurrencyConflict,
  ProjectionStateNotFound,
  type ProjectionState,
  type ProjectionStateRepository,
  type ProjectionStatus,
  type ProjectionTransactionContext,
  transitionProjectionStatus
} from "../contracts/index.js";
import { type ProjectionTransactionManager } from "../application/index.js";

type QueryResult<TRow> = { readonly rows: TRow[] };
type DrizzleExecutor = {
  execute<TRow extends Record<string, unknown>>(query: SQL): Promise<QueryResult<TRow>>;
};
type DrizzleProjectionTransactionContext = ProjectionTransactionContext & Readonly<{ client: DrizzleExecutor }>;

const maxLastErrorLength = 500;

function executorFrom(db: Database, tx?: ProjectionTransactionContext): DrizzleExecutor {
  if (!tx) return db as unknown as DrizzleExecutor;
  const candidate = tx as Partial<DrizzleProjectionTransactionContext>;
  if (!candidate.client) throw new Error("Projection transaction context does not contain a Drizzle executor");
  return candidate.client;
}

export class DrizzleProjectionTransactionManager implements ProjectionTransactionManager {
  public constructor(private readonly db: Database) {}

  public async transaction<T>(run: (tx: ProjectionTransactionContext) => Promise<T>): Promise<T> {
    return this.db.transaction(async (client) => {
      const tx: DrizzleProjectionTransactionContext = {
        id: crypto.randomUUID(),
        client: client as unknown as DrizzleExecutor
      };
      return run(tx);
    });
  }
}

export class DrizzleProjectionStateRepository implements ProjectionStateRepository {
  public constructor(private readonly db: Database) {}

  public async createIfMissing(identity: ProjectionIdentity, tx?: ProjectionTransactionContext): Promise<ProjectionState> {
    const executor = executorFrom(this.db, tx);
    await executor.execute(sql`
      INSERT INTO projection_states (projection_name, projection_version)
      VALUES (${identity.projectionName}, ${identity.projectionVersion})
      ON CONFLICT (projection_name, projection_version) DO NOTHING
    `);
    const state = await this.getByIdentity(identity, tx);
    if (!state) throw new ProjectionStateNotFound(projectionIdentityKey(identity));
    return state;
  }

  public async getByIdentity(identity: ProjectionIdentity, tx?: ProjectionTransactionContext): Promise<ProjectionState | null> {
    const result = await executorFrom(this.db, tx).execute<ProjectionStateRow>(sql`
      SELECT
        projection_name,
        projection_version,
        status,
        last_processed_event_id,
        last_processed_event_created_at,
        last_processed_at,
        rebuild_started_at,
        rebuild_completed_at,
        failure_count,
        last_error,
        version,
        created_at,
        updated_at
      FROM projection_states
      WHERE projection_name = ${identity.projectionName}
        AND projection_version = ${identity.projectionVersion}
      LIMIT 1
    `);
    return result.rows[0] ? rowToProjectionState(result.rows[0]) : null;
  }

  public async updateStatus(input: Parameters<ProjectionStateRepository["updateStatus"]>[0], tx?: ProjectionTransactionContext) {
    const current = await this.getByIdentity(input.identity, tx);
    if (!current) return err(new ProjectionStateNotFound(projectionIdentityKey(input.identity)));

    const transition = transitionProjectionStatus({
      identity: input.identity,
      current: current.status,
      next: input.nextStatus
    });
    if (!transition.ok) return err(transition.error);
    if (!transition.value.changed) return ok(current);

    if (current.version !== input.expectedVersion) {
      return err(new ProjectionStateConcurrencyConflict());
    }

    const result = await executorFrom(this.db, tx).execute<ProjectionStateRow>(sql`
      UPDATE projection_states
      SET status = ${input.nextStatus},
          version = version + 1,
          updated_at = ${input.updatedAt.toISOString()}
      WHERE projection_name = ${input.identity.projectionName}
        AND projection_version = ${input.identity.projectionVersion}
        AND version = ${input.expectedVersion}
      RETURNING *
    `);
    const row = result.rows[0];
    return row ? ok(rowToProjectionState(row)) : err(new ProjectionStateConcurrencyConflict());
  }

  public async updateCheckpoint(input: Parameters<ProjectionStateRepository["updateCheckpoint"]>[0], tx?: ProjectionTransactionContext) {
    const existing = await this.ensureVersionMatches(input.identity, input.expectedVersion, tx);
    if (!existing.ok) return existing;

    const result = await executorFrom(this.db, tx).execute<ProjectionStateRow>(sql`
      UPDATE projection_states
      SET last_processed_event_id = ${input.checkpoint.eventId},
          last_processed_event_created_at = ${input.checkpoint.eventCreatedAt.toISOString()},
          last_processed_at = ${input.checkpoint.processedAt.toISOString()},
          version = version + 1,
          updated_at = ${input.updatedAt.toISOString()}
      WHERE projection_name = ${input.identity.projectionName}
        AND projection_version = ${input.identity.projectionVersion}
        AND version = ${input.expectedVersion}
      RETURNING *
    `);
    const row = result.rows[0];
    return row ? ok(rowToProjectionState(row)) : err(new ProjectionStateConcurrencyConflict());
  }

  public async recordFailure(input: Parameters<ProjectionStateRepository["recordFailure"]>[0], tx?: ProjectionTransactionContext) {
    const existing = await this.ensureVersionMatches(input.identity, input.expectedVersion, tx);
    if (!existing.ok) return existing;

    const result = await executorFrom(this.db, tx).execute<ProjectionStateRow>(sql`
      UPDATE projection_states
      SET failure_count = failure_count + 1,
          last_error = ${sanitizeLastError(input.lastError)},
          version = version + 1,
          updated_at = ${input.updatedAt.toISOString()}
      WHERE projection_name = ${input.identity.projectionName}
        AND projection_version = ${input.identity.projectionVersion}
        AND version = ${input.expectedVersion}
      RETURNING *
    `);
    const row = result.rows[0];
    return row ? ok(rowToProjectionState(row)) : err(new ProjectionStateConcurrencyConflict());
  }

  public async clearFailure(input: Parameters<ProjectionStateRepository["clearFailure"]>[0], tx?: ProjectionTransactionContext) {
    const existing = await this.ensureVersionMatches(input.identity, input.expectedVersion, tx);
    if (!existing.ok) return existing;

    const result = await executorFrom(this.db, tx).execute<ProjectionStateRow>(sql`
      UPDATE projection_states
      SET failure_count = 0,
          last_error = NULL,
          version = version + 1,
          updated_at = ${input.updatedAt.toISOString()}
      WHERE projection_name = ${input.identity.projectionName}
        AND projection_version = ${input.identity.projectionVersion}
        AND version = ${input.expectedVersion}
      RETURNING *
    `);
    const row = result.rows[0];
    return row ? ok(rowToProjectionState(row)) : err(new ProjectionStateConcurrencyConflict());
  }

  private async ensureVersionMatches(identity: ProjectionIdentity, expectedVersion: number, tx?: ProjectionTransactionContext) {
    const current = await this.getByIdentity(identity, tx);
    if (!current) return err(new ProjectionStateNotFound(projectionIdentityKey(identity)));
    if (current.version !== expectedVersion) return err(new ProjectionStateConcurrencyConflict());
    return ok(current);
  }
}

export class DrizzleProjectionEventReceiptRepository implements ProjectionEventReceiptRepository {
  public constructor(private readonly db: Database) {}

  public async hasReceipt(input: Parameters<ProjectionEventReceiptRepository["hasReceipt"]>[0], tx?: ProjectionTransactionContext): Promise<boolean> {
    const result = await executorFrom(this.db, tx).execute<{ found: number }>(sql`
      SELECT 1 AS found
      FROM projection_event_receipts
      WHERE projection_name = ${input.identity.projectionName}
        AND projection_version = ${input.identity.projectionVersion}
        AND event_id = ${input.eventId}
      LIMIT 1
    `);
    return result.rows.length === 1;
  }

  public async insertReceipt(input: ProjectionEventReceiptInput, tx?: ProjectionTransactionContext) {
    const result = await executorFrom(this.db, tx).execute<{ inserted_event_id: string }>(sql`
      INSERT INTO projection_event_receipts (
        projection_name,
        projection_version,
        event_id,
        event_name,
        event_version,
        event_created_at,
        processed_at
      )
      VALUES (
        ${input.identity.projectionName},
        ${input.identity.projectionVersion},
        ${input.eventId},
        ${input.descriptor.eventName},
        ${input.descriptor.eventVersion},
        ${input.eventCreatedAt.toISOString()},
        ${input.processedAt.toISOString()}
      )
      ON CONFLICT (projection_name, projection_version, event_id) DO NOTHING
      RETURNING event_id AS inserted_event_id
    `);
    return ok(receiptResult(result.rows.length === 1));
  }
}

export class DrizzleProjectionRebuildReceiptRepository implements ProjectionRebuildReceiptRepository {
  public constructor(private readonly db: Database) {}

  public async hasReceipt(input: Parameters<ProjectionRebuildReceiptRepository["hasReceipt"]>[0], tx?: ProjectionTransactionContext): Promise<boolean> {
    const result = await executorFrom(this.db, tx).execute<{ found: number }>(sql`
      SELECT 1 AS found
      FROM projection_rebuild_receipts
      WHERE rebuild_id = ${input.rebuildId}
        AND projection_name = ${input.identity.projectionName}
        AND projection_version = ${input.identity.projectionVersion}
        AND event_id = ${input.eventId}
      LIMIT 1
    `);
    return result.rows.length === 1;
  }

  public async insertReceipt(input: ProjectionRebuildReceiptInput, tx?: ProjectionTransactionContext) {
    const result = await executorFrom(this.db, tx).execute<{ inserted_event_id: string }>(sql`
      INSERT INTO projection_rebuild_receipts (
        rebuild_id,
        projection_name,
        projection_version,
        event_id,
        event_name,
        event_version,
        event_created_at,
        processed_at
      )
      VALUES (
        ${input.rebuildId},
        ${input.identity.projectionName},
        ${input.identity.projectionVersion},
        ${input.eventId},
        ${input.descriptor.eventName},
        ${input.descriptor.eventVersion},
        ${input.eventCreatedAt.toISOString()},
        ${input.processedAt.toISOString()}
      )
      ON CONFLICT (rebuild_id, projection_name, projection_version, event_id) DO NOTHING
      RETURNING event_id AS inserted_event_id
    `);
    return ok(receiptResult(result.rows.length === 1));
  }

  public async countByRebuild(rebuildId: string, tx?: ProjectionTransactionContext): Promise<number> {
    const result = await executorFrom(this.db, tx).execute<{ receipt_count: number }>(sql`
      SELECT count(*)::int AS receipt_count
      FROM projection_rebuild_receipts
      WHERE rebuild_id = ${rebuildId}
    `);
    return result.rows[0]?.receipt_count ?? 0;
  }
}

type ProjectionStateRow = {
  readonly projection_name: string;
  readonly projection_version: string;
  readonly status: ProjectionStatus;
  readonly last_processed_event_id: string | null;
  readonly last_processed_event_created_at: Date | string | null;
  readonly last_processed_at: Date | string | null;
  readonly rebuild_started_at: Date | string | null;
  readonly rebuild_completed_at: Date | string | null;
  readonly failure_count: number;
  readonly last_error: string | null;
  readonly version: number;
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
};

function rowToProjectionState(row: ProjectionStateRow): ProjectionState {
  const projectionName = createProjectionName(row.projection_name);
  const projectionVersion = createProjectionVersion(row.projection_version);
  if (!projectionName.ok) throw projectionName.error;
  if (!projectionVersion.ok) throw projectionVersion.error;

  return {
    identity: createProjectionIdentity({
      projectionName: projectionName.value,
      projectionVersion: projectionVersion.value
    }),
    status: row.status,
    checkpoint: row.last_processed_event_id && row.last_processed_event_created_at && row.last_processed_at
      ? {
        eventId: row.last_processed_event_id,
        eventCreatedAt: toDate(row.last_processed_event_created_at),
        processedAt: toDate(row.last_processed_at)
      }
      : null,
    rebuildStartedAt: row.rebuild_started_at ? toDate(row.rebuild_started_at) : null,
    rebuildCompletedAt: row.rebuild_completed_at ? toDate(row.rebuild_completed_at) : null,
    failureCount: row.failure_count,
    lastError: row.last_error,
    version: row.version,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at)
  };
}

function receiptResult(inserted: boolean): ProjectionReceiptInsertResult {
  return inserted ? { inserted: true } : { inserted: false, reason: "already_exists" };
}

function sanitizeLastError(value: string): string {
  return value
    .replace(/password|token|secret|cookie|authorization|sql|phone|email/gi, "[REDACTED]")
    .slice(0, maxLastErrorLength);
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
