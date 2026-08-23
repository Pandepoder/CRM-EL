import { type ActorContext, type PermissionChecker } from "@tonala/shared/auth";
import { type ContactsReader } from "@tonala/modules/contacts/contracts";
import { type TerritoryReader, type ContactTerritorySummary } from "../contracts/index.js";
import { type TonalaOsError } from "@tonala/shared/errors";
import { type Clock, type EntityId, type Result } from "@tonala/shared/kernel";
import { type Logger } from "@tonala/shared/observability";

import { type ContactTerritory } from "../domain/index.js";

export type TransactionContext = Readonly<{ id: string }>;

export interface TransactionManager {
  transaction<T>(run: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export interface TerritoryCatalogReader {
  findActiveColonyById(colonyId: EntityId): Promise<Readonly<{ colonyId: EntityId; name: string }> | null>;
  listActiveColonies(): Promise<ReadonlyArray<{ colonyId: EntityId; name: string }>>;
}

export interface ContactTerritoryRepository {
  findByContactId(contactId: EntityId, tx?: TransactionContext): Promise<ContactTerritorySummary | null>;
  upsertInitial(link: ContactTerritory, tx: TransactionContext): Promise<void>;
  updateExisting(input: {
    readonly previousVersion: number;
    readonly next: ContactTerritory;
  }, tx: TransactionContext): Promise<boolean>;
}

export interface AuditWriter {
  write(input: {
    readonly actor: ActorContext;
    readonly action: "territory.contact_linked";
    readonly entityType: "contact_territory";
    readonly entityId: EntityId;
    readonly beforeData: Readonly<Record<string, unknown>> | null;
    readonly afterData: Readonly<Record<string, unknown>>;
  }, tx: TransactionContext): Promise<void>;
}

export interface OutboxWriter {
  writeContactLinkedToColony(input: {
    readonly eventId: EntityId;
    readonly contactTerritory: ContactTerritory;
    readonly actor: ActorContext;
    readonly occurredAt: Date;
  }, tx: TransactionContext): Promise<void>;
}

export interface IdGenerator {
  newId(): EntityId;
}

export type GetSectionStatsDependencies = Readonly<{
  territoryReader: TerritoryReader;
  logger: Logger;
  permissionChecker: PermissionChecker;
}>;

export type LinkContactToColonyDependencies = Readonly<{
  contactsReader: ContactsReader;
  territoryCatalogReader: TerritoryCatalogReader;
  contactTerritoryRepository: ContactTerritoryRepository;
  transactionManager: TransactionManager;
  auditWriter: AuditWriter;
  outboxWriter: OutboxWriter;
  clock: Clock;
  idGenerator: IdGenerator;
  logger: Logger;
  permissionChecker: PermissionChecker;
}>;

export type GetContactTerritoryDependencies = Readonly<{
  contactTerritoryRepository: ContactTerritoryRepository;
  logger: Logger;
  permissionChecker: PermissionChecker;
}>;

export type UseCaseResult<T> = Promise<Result<T, TonalaOsError>>;
