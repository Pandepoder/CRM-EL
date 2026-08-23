import { type ActorContext, type PermissionChecker } from "@tonala/shared/auth";
import { type ContactsReader } from "@tonala/modules/contacts/contracts";
import { type TerritoryReader } from "@tonala/modules/territory/contracts";
import { type TonalaOsError } from "@tonala/shared/errors";
import { type Clock, type EntityId, type Result } from "@tonala/shared/kernel";
import { type Logger } from "@tonala/shared/observability";

import { type ContactAssignmentSummary } from "../contracts/index.js";
import { type ContactAssignment } from "../domain/index.js";

export type TransactionContext = Readonly<{ id: string }>;

export interface TransactionManager {
  transaction<T>(run: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export type UserDirectoryView = Readonly<{
  userId: EntityId;
  active: boolean;
  roles: readonly string[];
  permissions: readonly string[];
}>;

export interface UserDirectoryReader {
  getUserCapability(userId: EntityId): Promise<UserDirectoryView | null>;
}

export interface ContactAssignmentRepository {
  findByContactId(contactId: EntityId, tx?: TransactionContext): Promise<ContactAssignmentSummary | null>;
  insertInitial(assignment: ContactAssignment, tx: TransactionContext): Promise<void>;
  updateExisting(input: {
    readonly previousVersion: number;
    readonly next: ContactAssignment;
  }, tx: TransactionContext): Promise<boolean>;
}

export interface AuditWriter {
  write(input: {
    readonly actor: ActorContext;
    readonly action: "assignments.responsible_assigned";
    readonly entityType: "contact_assignment";
    readonly entityId: EntityId;
    readonly beforeData: Readonly<Record<string, unknown>> | null;
    readonly afterData: Readonly<Record<string, unknown>>;
  }, tx: TransactionContext): Promise<void>;
}

export interface OutboxWriter {
  writeResponsibleAssigned(input: {
    readonly eventId: EntityId;
    readonly assignment: ContactAssignment;
    readonly actor: ActorContext;
    readonly occurredAt: Date;
  }, tx: TransactionContext): Promise<void>;
}

export interface IdGenerator {
  newId(): EntityId;
}

export type AssignResponsibleDependencies = Readonly<{
  contactsReader: ContactsReader;
  territoryReader: TerritoryReader;
  userDirectoryReader: UserDirectoryReader;
  contactAssignmentRepository: ContactAssignmentRepository;
  transactionManager: TransactionManager;
  auditWriter: AuditWriter;
  outboxWriter: OutboxWriter;
  clock: Clock;
  idGenerator: IdGenerator;
  logger: Logger;
  permissionChecker: PermissionChecker;
}>;

export type GetContactAssignmentDependencies = Readonly<{
  contactAssignmentRepository: ContactAssignmentRepository;
  logger: Logger;
  permissionChecker: PermissionChecker;
}>;

export type UseCaseResult<T> = Promise<Result<T, TonalaOsError>>;
