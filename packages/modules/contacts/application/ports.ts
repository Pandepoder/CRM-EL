import { type ActorContext, type PermissionChecker } from "@tonala/shared/auth";
import { type TonalaOsError } from "@tonala/shared/errors";
import { type Clock, type EntityId, type Result } from "@tonala/shared/kernel";
import { type Logger } from "@tonala/shared/observability";

import { type ContactSummary, type ContactsReader } from "../contracts/index.js";
import { type Contact } from "../domain/index.js";

export type TransactionContext = Readonly<{ id: string }>;

export interface TransactionManager {
  transaction<T>(run: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export interface ContactRepository {
  insert(contact: Contact, tx: TransactionContext): Promise<void>;
  findById(contactId: EntityId): Promise<ContactSummary | null>;
}

export interface AuditWriter {
  write(input: {
    readonly actor: ActorContext;
    readonly action: "contacts.register";
    readonly entityType: "contact";
    readonly entityId: EntityId;
    readonly beforeData: null;
    readonly afterData: Readonly<Record<string, unknown>>;
  }, tx: TransactionContext): Promise<void>;
}

export interface OutboxWriter {
  writeContactRegistered(input: {
    readonly eventId: EntityId;
    readonly contact: Contact;
    readonly actor: ActorContext;
    readonly occurredAt: Date;
  }, tx: TransactionContext): Promise<void>;
}

export interface IdGenerator {
  newId(): EntityId;
}

export type RegisterMinimalContactDependencies = Readonly<{
  contactRepository: ContactRepository;
  transactionManager: TransactionManager;
  outboxWriter: OutboxWriter;
  auditWriter: AuditWriter;
  clock: Clock;
  idGenerator: IdGenerator;
  logger: Logger;
  permissionChecker: PermissionChecker;
}>;

export type GetContactByIdDependencies = Readonly<{
  contactRepository: ContactRepository;
  logger: Logger;
  permissionChecker: PermissionChecker;
}>;

export type ListContactsDependencies = Readonly<{
  contactsReader: ContactsReader;
  logger: Logger;
  permissionChecker: PermissionChecker;
  assignedUserId?: EntityId;
}>;

export type GetContactDetailDependencies = Readonly<{
  contactsReader: ContactsReader;
  logger: Logger;
  permissionChecker: PermissionChecker;
}>;

export type UseCaseResult<T> = Promise<Result<T, TonalaOsError>>;
