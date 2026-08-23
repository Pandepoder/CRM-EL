import { type ActorContext, type PermissionChecker } from "@tonala/shared/auth";
import { type ContactsReader } from "@tonala/modules/contacts/contracts";
import { type TerritoryReader } from "@tonala/modules/territory/contracts";
import { type AssignmentsReader } from "@tonala/modules/assignments/contracts";
import { type TonalaOsError } from "@tonala/shared/errors";
import { type Clock, type EntityId, type Result } from "@tonala/shared/kernel";
import { type Logger } from "@tonala/shared/observability";

import { type VisitSummaryView, type VisitsReader } from "../contracts/index.js";
import { type Visit, type VisitResult } from "../domain/index.js";

export type TransactionContext = Readonly<{ id: string }>;

export interface TransactionManager {
  transaction<T>(run: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export interface VisitRepository {
  insert(visit: Visit, tx: TransactionContext): Promise<void>;
  findById(visitId: EntityId, tx?: TransactionContext): Promise<VisitSummaryView | null>;
  updateCompleted(input: {
    readonly previousVersion: number;
    readonly next: Readonly<{
      readonly visitId: EntityId;
      readonly completedAt: Date;
      readonly completedByUserId: EntityId;
      readonly version: number;
    }>;
  }, tx: TransactionContext): Promise<boolean>;
}

export interface VisitResultRepository {
  insert(result: VisitResult, tx: TransactionContext): Promise<void>;
}

export interface AuditWriter {
  write(input: {
    readonly actor: ActorContext;
    readonly action: "visits.scheduled" | "visits.completed";
    readonly entityType: "visit";
    readonly entityId: EntityId;
    readonly beforeData: Readonly<Record<string, unknown>> | null;
    readonly afterData: Readonly<Record<string, unknown>>;
  }, tx: TransactionContext): Promise<void>;
}

export interface OutboxWriter {
  writeVisitScheduled(input: {
    readonly eventId: EntityId;
    readonly visit: Visit;
    readonly actor: ActorContext;
    readonly occurredAt: Date;
  }, tx: TransactionContext): Promise<void>;
  writeVisitCompleted(input: {
    readonly eventId: EntityId;
    readonly visit: VisitSummaryView;
    readonly result: VisitResult;
    readonly actor: ActorContext;
    readonly occurredAt: Date;
  }, tx: TransactionContext): Promise<void>;
}

export interface IdGenerator {
  newId(): EntityId;
}

export type ScheduleVisitDependencies = Readonly<{
  contactsReader: ContactsReader;
  territoryReader: TerritoryReader;
  assignmentsReader: AssignmentsReader;
  visitRepository: VisitRepository;
  transactionManager: TransactionManager;
  auditWriter: AuditWriter;
  outboxWriter: OutboxWriter;
  clock: Clock;
  idGenerator: IdGenerator;
  logger: Logger;
  permissionChecker: PermissionChecker;
}>;

export type GetVisitByIdDependencies = Readonly<{
  visitRepository: VisitRepository;
  logger: Logger;
  permissionChecker: PermissionChecker;
}>;

export type CompleteVisitDependencies = Readonly<{
  visitRepository: VisitRepository;
  visitResultRepository: VisitResultRepository;
  transactionManager: TransactionManager;
  auditWriter: AuditWriter;
  outboxWriter: OutboxWriter;
  clock: Clock;
  idGenerator: IdGenerator;
  logger: Logger;
  permissionChecker: PermissionChecker;
}>;

export type ListVisitsByContactDependencies = Readonly<{
  visitsReader: VisitsReader;
  logger: Logger;
  permissionChecker: PermissionChecker;
}>;

export type ListVisitsForUserDependencies = Readonly<{
  visitsReader: VisitsReader;
  logger: Logger;
  permissionChecker: PermissionChecker;
}>;

export type UseCaseResult<T> = Promise<Result<T, TonalaOsError>>;
