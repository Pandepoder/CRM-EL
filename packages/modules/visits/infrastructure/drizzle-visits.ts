import { sql, type SQL } from "drizzle-orm";
import { type Database } from "@tonala/shared/database";
import { createEntityId } from "@tonala/shared/kernel";

import { type VisitCompletedV1, type VisitScheduledV1, type VisitsReader } from "../contracts/index.js";
import {
  type AuditWriter,
  type IdGenerator,
  type OutboxWriter,
  type TransactionContext,
  type TransactionManager,
  type VisitRepository,
  type VisitResultRepository
} from "../application/index.js";
import { type Visit, type VisitResult } from "../domain/index.js";

type QueryResult<TRow> = { readonly rows: TRow[] };
type DrizzleExecutor = {
  execute<TRow extends Record<string, unknown>>(query: SQL): Promise<QueryResult<TRow>>;
};
type DrizzleTransactionContext = TransactionContext & Readonly<{ client: DrizzleExecutor }>;

function executorFrom(tx: TransactionContext): DrizzleExecutor {
  const candidate = tx as Partial<DrizzleTransactionContext>;
  if (!candidate.client) throw new Error("Transaction context does not contain a Drizzle executor");
  return candidate.client;
}

export class CryptoIdGenerator implements IdGenerator {
  public newId() {
    return createEntityId(crypto.randomUUID());
  }
}

export class DrizzleTransactionManager implements TransactionManager {
  public constructor(private readonly db: Database) {}

  public async transaction<T>(run: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return this.db.transaction(async (client) => {
      const tx: DrizzleTransactionContext = { id: crypto.randomUUID(), client: client as DrizzleExecutor };
      return run(tx);
    });
  }
}

export class DrizzleVisitRepository implements VisitRepository, VisitsReader {
  public constructor(private readonly db: Database) {}

  public async getVisitById(visitId: ReturnType<typeof createEntityId>) {
    return this.findById(visitId);
  }

  public async insert(visit: Visit, tx: TransactionContext): Promise<void> {
    await executorFrom(tx).execute(sql`
      INSERT INTO visits (
        id,
        contact_id,
        colony_id,
        assigned_user_id,
        scheduled_at,
        status,
        visit_location_text,
        created_by_user_id,
        created_at,
        completed_at,
        completed_by_user_id,
        version,
        updated_at
      )
      VALUES (
        ${visit.visitId},
        ${visit.contactId},
        ${visit.colonyId},
        ${visit.assignedUserId},
        ${visit.scheduledAt.toISOString()},
        ${visit.status},
        ${visit.visitLocationText},
        ${visit.createdByUserId},
        ${visit.createdAt.toISOString()},
        ${visit.completedAt?.toISOString() ?? null},
        ${visit.completedByUserId},
        ${visit.version},
        ${visit.createdAt.toISOString()}
      )
    `);
  }

  public async findById(visitId: ReturnType<typeof createEntityId>, tx?: TransactionContext) {
    const executor = tx ? executorFrom(tx) : this.db;
    const result = await executor.execute<{
      visit_id: string;
      contact_id: string;
      colony_id: string;
      assigned_user_id: string;
      scheduled_at: Date;
      status: "scheduled" | "completed";
      visit_location_text: string;
      created_at: Date;
      completed_at: Date | null;
      completed_by_user_id: string | null;
      structured_outcome: "successful" | "no_contact" | "follow_up_required" | "rejected" | null;
      summary: string | null;
      version: number;
    }>(sql`
      SELECT
        visits.id::text AS visit_id,
        visits.contact_id::text AS contact_id,
        visits.colony_id::text AS colony_id,
        visits.assigned_user_id::text AS assigned_user_id,
        visits.scheduled_at,
        visits.status,
        visits.visit_location_text,
        visits.created_at,
        visits.completed_at,
        visits.completed_by_user_id::text AS completed_by_user_id,
        visit_results.structured_outcome,
        visit_results.summary,
        visits.version
      FROM visits
      LEFT JOIN visit_results ON visit_results.visit_id = visits.id
      WHERE visits.id = ${visitId}
      LIMIT 1
    `);
    const row = result.rows[0];
    return row
      ? {
      visitId: createEntityId(row.visit_id),
      contactId: createEntityId(row.contact_id),
      colonyId: createEntityId(row.colony_id),
      assignedUserId: createEntityId(row.assigned_user_id),
      scheduledAt: new Date(row.scheduled_at).toISOString(),
      status: row.status,
      visitLocationText: row.visit_location_text,
      createdAt: new Date(row.created_at).toISOString(),
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      completedByUserId: row.completed_by_user_id ? createEntityId(row.completed_by_user_id) : null,
      outcome: row.structured_outcome,
      summary: row.summary,
      version: row.version
    }
      : null;
  }

  public async updateCompleted(input: {
    readonly previousVersion: number;
    readonly next: Readonly<{
      readonly visitId: ReturnType<typeof createEntityId>;
      readonly completedAt: Date;
      readonly completedByUserId: ReturnType<typeof createEntityId>;
      readonly version: number;
    }>;
  }, tx: TransactionContext): Promise<boolean> {
    const result = await executorFrom(tx).execute<{ updated_visit_id: string }>(sql`
      UPDATE visits
      SET status = 'completed',
          completed_at = ${input.next.completedAt.toISOString()},
          completed_by_user_id = ${input.next.completedByUserId},
          version = ${input.next.version},
          updated_at = ${input.next.completedAt.toISOString()}
      WHERE id = ${input.next.visitId}
        AND version = ${input.previousVersion}
        AND status = 'scheduled'
      RETURNING id::text AS updated_visit_id
    `);
    return result.rows.length === 1;
  }

  public async listVisitsByContact(contactId: ReturnType<typeof createEntityId>) {
    type VisitRow = {
      visitId: string;
      scheduledAt: Date;
      status: "scheduled" | "completed";
      visitLocationText: string;
      outcome: "successful" | "no_contact" | "follow_up_required" | "rejected" | null;
      summary: string | null;
      completedAt: Date | null;
      assignedUserName: string | null;
    };

    const result = await this.db.execute<VisitRow>(sql`
      SELECT
        v.id::text AS "visitId",
        v.scheduled_at AS "scheduledAt",
        v.status,
        v.visit_location_text AS "visitLocationText",
        vr.structured_outcome AS "outcome",
        vr.summary,
        v.completed_at AS "completedAt",
        u.display_name AS "assignedUserName"
      FROM visits v
      LEFT JOIN visit_results vr ON vr.visit_id = v.id
      LEFT JOIN user_profiles u ON u.id = v.assigned_user_id
      WHERE v.contact_id = ${contactId}
      ORDER BY v.scheduled_at DESC
    `);

    return result.rows.map(row => ({
      visitId: createEntityId(row.visitId),
      scheduledAt: new Date(row.scheduledAt).toISOString(),
      status: row.status,
      visitLocationText: row.visitLocationText,
      outcome: row.outcome,
      summary: row.summary,
      completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : null,
      assignedUserName: row.assignedUserName
    }));
  }

  public async listVisitsForUser(userId: string, onlyToday = false) {
    type UserVisitRow = {
      visitId: string;
      contactId: string;
      contactName: string;
      colonyName: string | null;
      scheduledAt: Date;
      status: "scheduled" | "completed";
      visitLocationText: string;
      outcome: "successful" | "no_contact" | "follow_up_required" | "rejected" | null;
    };

    const todayFilter = onlyToday
      ? sql` AND v.scheduled_at::date = CURRENT_DATE`
      : sql``;

    const result = await this.db.execute<UserVisitRow>(sql`
      SELECT
        v.id::text AS "visitId",
        v.contact_id::text AS "contactId",
        c.display_name AS "contactName",
        col.name AS "colonyName",
        v.scheduled_at AS "scheduledAt",
        v.status,
        v.visit_location_text AS "visitLocationText",
        vr.structured_outcome AS "outcome"
      FROM visits v
      INNER JOIN contacts c ON c.id = v.contact_id
      LEFT JOIN contact_territory ct ON ct.contact_id = c.id AND ct.territory_status = 'confirmed'
      LEFT JOIN colonies col ON col.id = ct.colony_id
      LEFT JOIN visit_results vr ON vr.visit_id = v.id
      WHERE v.assigned_user_id = ${userId}${todayFilter}
      ORDER BY v.scheduled_at ASC
    `);

    return result.rows.map(row => ({
      visitId: createEntityId(row.visitId),
      contactId: createEntityId(row.contactId),
      contactName: row.contactName,
      colonyName: row.colonyName,
      scheduledAt: new Date(row.scheduledAt).toISOString(),
      status: row.status,
      visitLocationText: row.visitLocationText,
      outcome: row.outcome
    }));
  }
}

export class DrizzleVisitResultRepository implements VisitResultRepository {
  public async insert(result: VisitResult, tx: TransactionContext): Promise<void> {
    await executorFrom(tx).execute(sql`
      INSERT INTO visit_results (
        visit_id,
        structured_outcome,
        summary,
        completed_by_user_id,
        completed_at
      )
      VALUES (
        ${result.visitId},
        ${result.structuredOutcome},
        ${result.summary},
        ${result.completedByUserId},
        ${result.completedAt.toISOString()}
      )
    `);
  }
}

export class DrizzleAuditWriter implements AuditWriter {
  public async write(input: Parameters<AuditWriter["write"]>[0], tx: TransactionContext): Promise<void> {
    await executorFrom(tx).execute(sql`
      INSERT INTO audit_logs (
        actor_user_id,
        action,
        entity_type,
        entity_id,
        before_data,
        after_data,
        correlation_id
      )
      VALUES (
        ${input.actor.actorId},
        ${input.action},
        ${input.entityType},
        ${input.entityId},
        ${JSON.stringify(input.beforeData)}::jsonb,
        ${JSON.stringify(input.afterData)}::jsonb,
        ${input.actor.correlationId}
      )
    `);
  }
}

export class DrizzleOutboxWriter implements OutboxWriter {
  public async writeVisitScheduled(
    input: Parameters<OutboxWriter["writeVisitScheduled"]>[0],
    tx: TransactionContext
  ): Promise<void> {
    const event: VisitScheduledV1 = {
      name: "VisitScheduled.v1",
      version: 1,
      payload: {
        visit_id: input.visit.visitId,
        contact_id: input.visit.contactId,
        assigned_user_id: input.visit.assignedUserId,
        colony_id: input.visit.colonyId,
        scheduled_at: input.visit.scheduledAt.toISOString()
      },
      metadata: {
        event_id: input.eventId,
        event_name: "VisitScheduled.v1",
        event_version: 1,
        occurred_at: input.occurredAt.toISOString(),
        correlation_id: input.actor.correlationId,
        actor_id: input.actor.actorId,
        aggregate_type: "visit",
        aggregate_id: input.visit.visitId
      }
    };
    await insertOutbox(executorFrom(tx), input.eventId, input.visit.visitId, "VisitScheduled.v1", event.payload, event.metadata);
  }

  public async writeVisitCompleted(
    input: Parameters<OutboxWriter["writeVisitCompleted"]>[0],
    tx: TransactionContext
  ): Promise<void> {
    const event: VisitCompletedV1 = {
      name: "VisitCompleted.v1",
      version: 1,
      payload: {
        visit_id: input.visit.visitId,
        contact_id: input.visit.contactId,
        completed_by_user_id: input.result.completedByUserId,
        completed_at: input.result.completedAt.toISOString(),
        outcome: input.result.structuredOutcome
      },
      metadata: {
        event_id: input.eventId,
        event_name: "VisitCompleted.v1",
        event_version: 1,
        occurred_at: input.occurredAt.toISOString(),
        correlation_id: input.actor.correlationId,
        actor_id: input.actor.actorId,
        aggregate_type: "visit",
        aggregate_id: input.visit.visitId
      }
    };
    await insertOutbox(executorFrom(tx), input.eventId, input.visit.visitId, "VisitCompleted.v1", event.payload, event.metadata);
  }
}

async function insertOutbox(
  executor: DrizzleExecutor,
  eventId: string,
  aggregateId: string,
  eventName: "VisitScheduled.v1" | "VisitCompleted.v1",
  payload: Readonly<Record<string, unknown>>,
  metadata: Readonly<Record<string, unknown>>
): Promise<void> {
  await executor.execute(sql`
    INSERT INTO transactional_outbox (
      event_id,
      aggregate_type,
      aggregate_id,
      event_name,
      event_version,
      payload,
      metadata,
      status,
      attempts
    )
    VALUES (
      ${eventId},
      'visit',
      ${aggregateId},
      ${eventName},
      1,
      ${JSON.stringify(payload)}::jsonb,
      ${JSON.stringify(metadata)}::jsonb,
      'pending',
      0
    )
  `);
}
