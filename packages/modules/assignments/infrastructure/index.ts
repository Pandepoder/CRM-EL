import { sql, type SQL } from "drizzle-orm";
import { type Database } from "@tonala/shared/database";
import { createEntityId } from "@tonala/shared/kernel";

import { type AssignmentsReader, type ResponsibleAssignedV1 } from "../contracts/index.js";
import {
  type AuditWriter,
  type ContactAssignmentRepository,
  type IdGenerator,
  type OutboxWriter,
  type TransactionContext,
  type TransactionManager,
  type UserDirectoryReader
} from "../application/index.js";
import { type ContactAssignment } from "../domain/index.js";

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

export class DrizzleUserDirectoryReader implements UserDirectoryReader {
  public constructor(private readonly db: Database) {}

  public async getUserCapability(userId: ReturnType<typeof createEntityId>) {
    const result = await this.db.execute<{
      user_id: string;
      status: string;
      role_key: string;
    }>(sql`
      SELECT user_profiles.id::text AS user_id, user_profiles.status, roles.key AS role_key
      FROM user_profiles
      INNER JOIN roles ON roles.id = user_profiles.role_id
      WHERE user_profiles.id = ${userId}
      LIMIT 1
    `);
    const row = result.rows[0];
    return row
      ? {
      userId: createEntityId(row.user_id),
      active: row.status === "active",
      roles: [row.role_key],
      permissions: []
    }
      : null;
  }
}

export class DrizzleContactAssignmentRepository implements ContactAssignmentRepository, AssignmentsReader {
  public constructor(private readonly db: Database) {}

  public async getContactAssignment(contactId: ReturnType<typeof createEntityId>) {
    return this.findByContactId(contactId);
  }

  public async findByContactId(contactId: ReturnType<typeof createEntityId>, tx?: TransactionContext) {
    const executor = tx ? executorFrom(tx) : this.db;
    const result = await executor.execute<{
      contact_id: string;
      assigned_user_id: string;
      assignment_status: "active";
      assigned_at: Date;
      version: number;
    }>(sql`
      SELECT
        contact_id::text AS contact_id,
        assigned_user_id::text AS assigned_user_id,
        assignment_status,
        assigned_at,
        version
      FROM contact_assignments
      WHERE contact_id = ${contactId}
      LIMIT 1
    `);
    const row = result.rows[0];
    return row
      ? {
      contactId: createEntityId(row.contact_id),
      assignedUserId: createEntityId(row.assigned_user_id),
      assignmentStatus: row.assignment_status,
      assignedAt: new Date(row.assigned_at).toISOString(),
      version: row.version
    }
      : null;
  }

  public async insertInitial(assignment: ContactAssignment, tx: TransactionContext): Promise<void> {
    await executorFrom(tx).execute(sql`
      INSERT INTO contact_assignments (
        contact_id,
        assigned_user_id,
        assignment_status,
        assigned_by_user_id,
        assigned_at,
        version,
        updated_at
      )
      VALUES (
        ${assignment.contactId},
        ${assignment.assignedUserId},
        ${assignment.assignmentStatus},
        ${assignment.assignedByUserId},
        ${assignment.assignedAt.toISOString()},
        ${assignment.version},
        ${assignment.assignedAt.toISOString()}
      )
    `);
  }

  public async updateExisting(input: {
    readonly previousVersion: number;
    readonly next: ContactAssignment;
  }, tx: TransactionContext): Promise<boolean> {
    const result = await executorFrom(tx).execute<{ updated_contact_id: string }>(sql`
      UPDATE contact_assignments
      SET assigned_user_id = ${input.next.assignedUserId},
          assignment_status = ${input.next.assignmentStatus},
          assigned_by_user_id = ${input.next.assignedByUserId},
          assigned_at = ${input.next.assignedAt.toISOString()},
          version = ${input.next.version},
          updated_at = ${input.next.assignedAt.toISOString()}
      WHERE contact_id = ${input.next.contactId}
        AND version = ${input.previousVersion}
      RETURNING contact_id::text AS updated_contact_id
    `);
    return result.rows.length === 1;
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
  public async writeResponsibleAssigned(
    input: Parameters<OutboxWriter["writeResponsibleAssigned"]>[0],
    tx: TransactionContext
  ): Promise<void> {
    const event: ResponsibleAssignedV1 = {
      name: "ResponsibleAssigned.v1",
      version: 1,
      payload: {
        contact_id: input.assignment.contactId,
        assigned_user_id: input.assignment.assignedUserId,
        assigned_by_user_id: input.assignment.assignedByUserId,
        assigned_at: input.assignment.assignedAt.toISOString()
      },
      metadata: {
        event_id: input.eventId,
        event_name: "ResponsibleAssigned.v1",
        event_version: 1,
        occurred_at: input.occurredAt.toISOString(),
        correlation_id: input.actor.correlationId,
        actor_id: input.actor.actorId,
        aggregate_type: "contact_assignment",
        aggregate_id: input.assignment.contactId
      }
    };

    await executorFrom(tx).execute(sql`
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
        ${input.eventId},
        'contact_assignment',
        ${input.assignment.contactId},
        'ResponsibleAssigned.v1',
        1,
        ${JSON.stringify(event.payload)}::jsonb,
        ${JSON.stringify(event.metadata)}::jsonb,
        'pending',
        0
      )
    `);
  }
}
