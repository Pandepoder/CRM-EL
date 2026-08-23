import { sql, type SQL } from "drizzle-orm";
import { type Database } from "@tonala/shared/database";
import { createEntityId } from "@tonala/shared/kernel";

import { type ContactLinkedToColonyV1, type TerritoryReader } from "../contracts/index.js";
import {
  type AuditWriter,
  type ContactTerritoryRepository,
  type IdGenerator,
  type OutboxWriter,
  type TerritoryCatalogReader,
  type TransactionContext,
  type TransactionManager
} from "../application/index.js";
import { type ContactTerritory } from "../domain/index.js";

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

export class DrizzleTerritoryCatalogReader implements TerritoryCatalogReader {
  public constructor(private readonly db: Database) {}

  public async findActiveColonyById(colonyId: ReturnType<typeof createEntityId>) {
    const result = await this.db.execute<{
      colony_id: string;
      name: string;
    }>(sql`
      SELECT colonies.id::text AS colony_id, colonies.name
      FROM colonies
      INNER JOIN catalog_versions ON catalog_versions.id = colonies.catalog_version_id
      WHERE colonies.id = ${colonyId}
        AND colonies.status = 'active'
      LIMIT 1
    `);
    const row = result.rows[0];
    return row
      ? {
      colonyId: createEntityId(row.colony_id),
      name: row.name
    }
      : null;
  }

  public async listActiveColonies() {
    const result = await this.db.execute<{
      colony_id: string;
      name: string;
    }>(sql`
      SELECT colonies.id::text AS colony_id, colonies.name
      FROM colonies
      INNER JOIN catalog_versions ON catalog_versions.id = colonies.catalog_version_id
      WHERE colonies.status = 'active'
      ORDER BY colonies.name ASC
    `);
    return result.rows.map(row => ({
      colonyId: createEntityId(row.colony_id),
      name: row.name
    }));
  }
}

export class DrizzleContactTerritoryRepository implements ContactTerritoryRepository {
  public constructor(private readonly db: Database) {}

  public async findByContactId(contactId: ReturnType<typeof createEntityId>, tx?: TransactionContext) {
    const executor = tx ? executorFrom(tx) : this.db;
    const result = await executor.execute<{
      contact_id: string;
      colony_id: string;
      colony_name: string;
      territory_status: "confirmed";
      linked_at: Date;
      version: number;
    }>(sql`
      SELECT
        contact_territory.contact_id::text AS contact_id,
        contact_territory.colony_id::text AS colony_id,
        colonies.name AS colony_name,
        contact_territory.territory_status,
        contact_territory.linked_at,
        contact_territory.version
      FROM contact_territory
      INNER JOIN colonies ON colonies.id = contact_territory.colony_id
      WHERE contact_territory.contact_id = ${contactId}
      LIMIT 1
    `);
    const row = result.rows[0];
    return row
      ? {
      contactId: createEntityId(row.contact_id),
      colonyId: createEntityId(row.colony_id),
      colonyName: row.colony_name,
      territoryStatus: row.territory_status,
      linkedAt: new Date(row.linked_at).toISOString(),
      version: row.version
    }
      : null;
  }

  public async upsertInitial(link: ContactTerritory, tx: TransactionContext): Promise<void> {
    await executorFrom(tx).execute(sql`
      INSERT INTO contact_territory (
        contact_id,
        colony_id,
        territory_status,
        linked_by_user_id,
        linked_at,
        version,
        updated_at
      )
      VALUES (
        ${link.contactId},
        ${link.colonyId},
        ${link.territoryStatus},
        ${link.linkedByUserId},
        ${link.linkedAt.toISOString()},
        ${link.version},
        ${link.linkedAt.toISOString()}
      )
    `);
  }

  public async updateExisting(input: {
    readonly previousVersion: number;
    readonly next: ContactTerritory;
  }, tx: TransactionContext): Promise<boolean> {
    const result = await executorFrom(tx).execute<{ updated_contact_id: string }>(sql`
      UPDATE contact_territory
      SET colony_id = ${input.next.colonyId},
          territory_status = ${input.next.territoryStatus},
          linked_by_user_id = ${input.next.linkedByUserId},
          linked_at = ${input.next.linkedAt.toISOString()},
          version = ${input.next.version},
          updated_at = ${input.next.linkedAt.toISOString()}
      WHERE contact_id = ${input.next.contactId}
        AND version = ${input.previousVersion}
      RETURNING contact_id::text AS updated_contact_id
    `);
    return result.rows.length === 1;
  }
}

export class DrizzleTerritoryReader implements TerritoryReader {
  private readonly repository: DrizzleContactTerritoryRepository;
  private readonly db: Database;

  public constructor(db: Database) {
    this.repository = new DrizzleContactTerritoryRepository(db);
    this.db = db;
  }

  public async getContactTerritory(contactId: ReturnType<typeof createEntityId>) {
    return this.repository.findByContactId(contactId);
  }

  public async listActiveColonies() {
    const result = await this.db.execute<{
      colony_id: string;
      name: string;
      assigned_users_count: string;
      contacts_count: string;
    }>(sql`
      SELECT 
        colonies.id::text AS colony_id, 
        colonies.name,
        COUNT(DISTINCT ca.assigned_user_id)::text AS assigned_users_count,
        COUNT(DISTINCT ct.contact_id)::text AS contacts_count
      FROM colonies
      INNER JOIN catalog_versions ON catalog_versions.id = colonies.catalog_version_id
      LEFT JOIN contact_territory ct ON ct.colony_id = colonies.id AND ct.territory_status = 'confirmed'
      LEFT JOIN contact_assignments ca ON ca.contact_id = ct.contact_id AND ca.assignment_status = 'active'
      WHERE colonies.status = 'active'
      GROUP BY colonies.id, colonies.name
      ORDER BY colonies.name ASC
    `);

    return result.rows.map(row => ({
      colonyId: createEntityId(row.colony_id),
      name: row.name,
      assignedUsersCount: parseInt(row.assigned_users_count, 10),
      contactsCount: parseInt(row.contacts_count, 10)
    }));
  }

  public async getSectionStats(sectionNum: number) {
    const result = await this.db.execute<{
      section_num: number;
      contact_count: string;
      visit_scheduled_count: string;
      visit_completed_count: string;
      colonies: string[];
    }>(sql`
      SELECT
        es.section_num,
        COUNT(DISTINCT ct.contact_id)::text AS contact_count,
        COUNT(DISTINCT CASE WHEN v.status = 'scheduled' THEN v.id END)::text AS visit_scheduled_count,
        COUNT(DISTINCT CASE WHEN v.status = 'completed' THEN v.id END)::text AS visit_completed_count,
        ARRAY_AGG(DISTINCT col.name) FILTER (WHERE col.name IS NOT NULL) AS colonies
      FROM electoral_sections es
      LEFT JOIN section_colonies sc ON sc.section_id = es.id
      LEFT JOIN colonies col ON col.id = sc.colony_id AND col.status = 'active'
      LEFT JOIN contact_territory ct ON ct.colony_id = col.id AND ct.territory_status = 'confirmed'
      LEFT JOIN visits v ON v.contact_id = ct.contact_id
      WHERE es.section_num = ${sectionNum}
      GROUP BY es.section_num
      LIMIT 1
    `);

    const row = result.rows[0];
    if (!row) return null;

    return {
      sectionNum: row.section_num,
      contactCount: parseInt(row.contact_count, 10),
      visitScheduledCount: parseInt(row.visit_scheduled_count, 10),
      visitCompletedCount: parseInt(row.visit_completed_count, 10),
      colonies: row.colonies || []
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
  public async writeContactLinkedToColony(
    input: Parameters<OutboxWriter["writeContactLinkedToColony"]>[0],
    tx: TransactionContext
  ): Promise<void> {
    const event: ContactLinkedToColonyV1 = {
      name: "ContactLinkedToColony.v1",
      version: 1,
      payload: {
        contact_id: input.contactTerritory.contactId,
        colony_id: input.contactTerritory.colonyId,
        territory_status: input.contactTerritory.territoryStatus,
        linked_at: input.contactTerritory.linkedAt.toISOString()
      },
      metadata: {
        event_id: input.eventId,
        event_name: "ContactLinkedToColony.v1",
        event_version: 1,
        occurred_at: input.occurredAt.toISOString(),
        correlation_id: input.actor.correlationId,
        actor_id: input.actor.actorId,
        aggregate_type: "contact_territory",
        aggregate_id: input.contactTerritory.contactId
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
        'contact_territory',
        ${input.contactTerritory.contactId},
        'ContactLinkedToColony.v1',
        1,
        ${JSON.stringify(event.payload)}::jsonb,
        ${JSON.stringify(event.metadata)}::jsonb,
        'pending',
        0
      )
    `);
  }
}
