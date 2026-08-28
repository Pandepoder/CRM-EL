import { sql, type SQL } from "drizzle-orm";
import { type Database, decryptData, encryptData } from "@tonala/shared/database";
import { createEntityId } from "@tonala/shared/kernel";

import { type ContactsReader, type ContactRegisteredV1 } from "../contracts/index.js";
import {
  type AuditWriter,
  type ContactRepository,
  type IdGenerator,
  type OutboxWriter,
  type TransactionContext,
  type TransactionManager
} from "../application/index.js";
import { type Contact } from "../domain/index.js";

type QueryResult<TRow> = {
  readonly rows: TRow[];
};

type DrizzleExecutor = {
  execute<TRow extends Record<string, unknown>>(query: SQL): Promise<QueryResult<TRow>>;
};

type DrizzleTransactionContext = TransactionContext & Readonly<{ client: DrizzleExecutor }>;

function executorFrom(tx: TransactionContext): DrizzleExecutor {
  const candidate = tx as Partial<DrizzleTransactionContext>;
  if (!candidate.client) {
    throw new Error("Transaction context does not contain a Drizzle executor");
  }
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
      const tx: DrizzleTransactionContext = {
        id: crypto.randomUUID(),
        client: client as DrizzleExecutor
      };
      return run(tx);
    });
  }
}

export class DrizzleContactRepository implements ContactRepository {
  public constructor(private readonly db: Database) {}

  public async insert(contact: Contact, tx: TransactionContext): Promise<void> {
    await executorFrom(tx).execute(sql`
      INSERT INTO contacts (id, display_name, phone, status, created_by_user_id, created_at, version)
      VALUES (
        ${contact.contactId},
        ${contact.displayName},
        ${encryptData(contact.phoneNumber ?? null)},
        ${contact.status},
        ${contact.createdByUserId},
        ${contact.createdAt.toISOString()},
        ${contact.version}
      )
    `);
  }

  public async findById(contactId: ReturnType<typeof createEntityId>) {
    const result = await this.db.execute<{
      contact_id: string;
      display_name: string;
      status: "active" | "inactive";
      created_at: Date;
      version: number;
    }>(sql`
      SELECT
        id::text AS contact_id,
        display_name,
        status,
        created_at,
        version
      FROM contacts
      WHERE id = ${contactId}
      LIMIT 1
    `);
    const row = result.rows[0];
    return row
      ? {
      contactId: createEntityId(row.contact_id),
      displayName: row.display_name,
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
      version: row.version
    }
      : null;
  }
}

export class DrizzleContactsReader implements ContactsReader {
  public constructor(private readonly db: Database) {}

  public async getContactStatus(contactId: ReturnType<typeof createEntityId>) {
    const result = await this.db.execute<{
      contact_id: string;
      status: "active" | "inactive";
      version: number;
    }>(sql`
      SELECT id::text AS contact_id, status, version
      FROM contacts
      WHERE id = ${contactId}
      LIMIT 1
    `);
    const row = result.rows[0];
    return row
      ? {
      contactId: createEntityId(row.contact_id),
      status: row.status,
      version: row.version
    }
      : null;
  }

  public async listContacts(options?: {
    assignedUserId?: ReturnType<typeof createEntityId>;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    const conditions = [];
    conditions.push(sql`c.status = 'active'`);
    if (options?.assignedUserId) {
      conditions.push(sql`ca.assigned_user_id = ${options.assignedUserId} AND ca.assignment_status = 'active'`);
    }
    if (options?.q) {
      const term = `%${options.q.trim()}%`;
      conditions.push(sql`(c.display_name ILIKE ${term} OR c.phone ILIKE ${term})`);
    }

    const whereClause = conditions.length > 0 
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.max(1, options?.pageSize || 25);
    const offset = (page - 1) * pageSize;

    const countResult = await this.db.execute<{ count: string }>(sql`
      SELECT COUNT(DISTINCT c.id) as count
      FROM contacts c
      LEFT JOIN contact_assignments ca ON ca.contact_id = c.id
      ${whereClause}
    `);
    const total = parseInt(countResult.rows[0]?.count || "0", 10);

    const result = await this.db.execute<{
      contactId: string;
      displayName: string;
      phone: string | null;
      colony: string | null;
      availability: string | null;
      skill: string | null;
      status: "active" | "inactive";
      createdAt: Date;
      territoryColonyName: string | null;
      responsibleName: string | null;
      lastVisitStatus: string | null;
    }>(sql`
      SELECT 
        c.id::text AS "contactId",
        c.display_name AS "displayName",
        c.phone,
        c.colony,
        c.availability,
        c.skill,
        c.status,
        c.created_at AS "createdAt",
        col.name AS "territoryColonyName",
        u.display_name AS "responsibleName",
        v.status AS "lastVisitStatus"
      FROM contacts c
      LEFT JOIN contact_territory ct ON ct.contact_id = c.id AND ct.territory_status = 'confirmed'
      LEFT JOIN contact_assignments ca ON ca.contact_id = c.id
      LEFT JOIN colonies col ON col.id = ct.colony_id
      LEFT JOIN user_profiles u ON u.id = ca.assigned_user_id
      LEFT JOIN LATERAL (
        SELECT status FROM visits 
        WHERE contact_id = c.id 
        ORDER BY created_at DESC LIMIT 1
      ) v ON true
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);
    
    return {
      items: result.rows.map(row => ({
        ...row,
        phone: decryptData(row.phone),
        colony: decryptData(row.colony),
        availability: decryptData(row.availability),
        skill: decryptData(row.skill),
        contactId: createEntityId(row.contactId),
        createdAt: new Date(row.createdAt).toISOString()
      })),
      total
    };
  }

  public async getContactDetail(contactId: ReturnType<typeof createEntityId>) {
    type DetailRow = {
      contactId: string;
      displayName: string;
      phoneNumber: string | null;
      status: "active" | "inactive";
      createdAt: Date;
      sectionId: string | null;
      sectionNum: number | null;
      colonyId: string | null;
      colonyName: string | null;
      linkedAt: Date | null;
      linkedByUserId: string | null;
      assignedUserId: string | null;
      assignedUserName: string | null;
      assignmentStatus: ("active" | "pending") | null;
      assignedAt: Date | null;
      assignedByUserId: string | null;
    };

    const result = await this.db.execute<DetailRow>(sql`
      SELECT 
        c.id::text AS "contactId",
        c.display_name AS "displayName",
        c.phone AS "phoneNumber",
        c.status,
        c.created_at AS "createdAt",
        c.section_id::text AS "sectionId",
        es.section_num AS "sectionNum",
        ct.colony_id::text AS "colonyId",
        col.name AS "colonyName",
        ct.linked_at AS "linkedAt",
        ct.linked_by_user_id::text AS "linkedByUserId",
        ca.assigned_user_id::text AS "assignedUserId",
        u.display_name AS "assignedUserName",
        ca.assignment_status AS "assignmentStatus",
        ca.assigned_at AS "assignedAt",
        ca.assigned_by_user_id::text AS "assignedByUserId"
      FROM contacts c
      LEFT JOIN electoral_sections es ON es.id = c.section_id
      LEFT JOIN contact_territory ct ON ct.contact_id = c.id AND ct.territory_status = 'confirmed'
      LEFT JOIN colonies col ON col.id = ct.colony_id
      LEFT JOIN contact_assignments ca ON ca.contact_id = c.id
      LEFT JOIN user_profiles u ON u.id = ca.assigned_user_id
      WHERE c.id = ${contactId}
      LIMIT 1
    `);

    const row = result.rows[0];
    if (!row) return null;

    const visitsResult = await this.db.execute<{
      visitId: string;
      scheduledAt: Date;
      status: string;
      outcome: string | null;
      summary: string | null;
      assignedUserName: string | null;
    }>(sql`
      SELECT 
        v.id::text AS "visitId",
        v.scheduled_at AS "scheduledAt",
        v.status,
        vr.structured_outcome AS "outcome",
        vr.summary,
        u.display_name AS "assignedUserName"
      FROM visits v
      LEFT JOIN visit_results vr ON vr.visit_id = v.id
      LEFT JOIN user_profiles u ON u.id = v.assigned_user_id
      WHERE v.contact_id = ${contactId}
      ORDER BY v.scheduled_at DESC
    `);

    return {
      contactId: createEntityId(row.contactId),
      displayName: row.displayName,
      phoneNumber: decryptData(row.phoneNumber),
      status: row.status,
      createdAt: new Date(row.createdAt).toISOString(),
      section: row.sectionId ? {
        sectionId: row.sectionId,
        sectionNum: row.sectionNum!
      } : null,
      territory: row.colonyId ? {
        colonyId: row.colonyId,
        colonyName: row.colonyName,
        linkedAt: new Date(row.linkedAt!).toISOString(),
        linkedByUserId: row.linkedByUserId
      } : null,
      assignment: row.assignedUserId && row.assignmentStatus ? {
        assignedUserId: row.assignedUserId,
        assignedUserName: row.assignedUserName,
        status: row.assignmentStatus,
        assignedAt: new Date(row.assignedAt!).toISOString(),
        assignedByUserId: row.assignedByUserId
      } : null,
      visits: visitsResult.rows.map(v => ({
        visitId: v.visitId,
        scheduledAt: new Date(v.scheduledAt).toISOString(),
        status: v.status,
        outcome: v.outcome,
        summary: v.summary,
        assignedUserName: v.assignedUserName
      }))
    };
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
  public async writeContactRegistered(
    input: Parameters<OutboxWriter["writeContactRegistered"]>[0],
    tx: TransactionContext
  ): Promise<void> {
    const event: ContactRegisteredV1 = {
      name: "ContactRegistered.v1",
      version: 1,
      payload: {
        contact_id: input.contact.contactId,
        created_by_user_id: input.contact.createdByUserId,
        created_at: input.contact.createdAt.toISOString()
      },
      metadata: {
        event_id: input.eventId,
        event_name: "ContactRegistered.v1",
        event_version: 1,
        occurred_at: input.occurredAt.toISOString(),
        correlation_id: input.actor.correlationId,
        actor_id: input.actor.actorId,
        aggregate_type: "contact",
        aggregate_id: input.contact.contactId
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
        'contact',
        ${input.contact.contactId},
        'ContactRegistered.v1',
        1,
        ${JSON.stringify(event.payload)}::jsonb,
        ${JSON.stringify(event.metadata)}::jsonb,
        'pending',
        0
      )
    `);
  }
}
