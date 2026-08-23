import { type Result } from "@tonala/shared/kernel";

import { type ProjectionEventDescriptor } from "./events.js";
import { type ProjectionIdentity, type ProjectionStatus } from "./identity.js";
import {
  type ProjectionCheckpoint,
  type ProjectionReceiptInsertResult,
  type ProjectionState,
  type ProjectionStateMutationError
} from "./state.js";
import type {
  ProjectionReceiptAlreadyExists,
  ProjectionStateConcurrencyConflict,
  ProjectionStateNotFound
} from "./persistence-errors.js";

export type ProjectionTransactionContext = Readonly<{ id: string }>;

export type ProjectionEventReceiptInput = Readonly<{
  identity: ProjectionIdentity;
  eventId: string;
  descriptor: ProjectionEventDescriptor;
  eventCreatedAt: Date;
  processedAt: Date;
}>;

export type ProjectionRebuildReceiptInput = ProjectionEventReceiptInput & Readonly<{
  rebuildId: string;
}>;

export interface ProjectionStateRepository {
  createIfMissing(identity: ProjectionIdentity, tx?: ProjectionTransactionContext): Promise<ProjectionState>;
  getByIdentity(identity: ProjectionIdentity, tx?: ProjectionTransactionContext): Promise<ProjectionState | null>;
  updateStatus(input: {
    readonly identity: ProjectionIdentity;
    readonly nextStatus: ProjectionStatus;
    readonly expectedVersion: number;
    readonly updatedAt: Date;
  }, tx?: ProjectionTransactionContext): Promise<Result<ProjectionState, ProjectionStateMutationError>>;
  updateCheckpoint(input: {
    readonly identity: ProjectionIdentity;
    readonly checkpoint: ProjectionCheckpoint;
    readonly expectedVersion: number;
    readonly updatedAt: Date;
  }, tx?: ProjectionTransactionContext): Promise<Result<ProjectionState, ProjectionStateNotFound | ProjectionStateConcurrencyConflict>>;
  recordFailure(input: {
    readonly identity: ProjectionIdentity;
    readonly lastError: string;
    readonly expectedVersion: number;
    readonly updatedAt: Date;
  }, tx?: ProjectionTransactionContext): Promise<Result<ProjectionState, ProjectionStateNotFound | ProjectionStateConcurrencyConflict>>;
  clearFailure(input: {
    readonly identity: ProjectionIdentity;
    readonly expectedVersion: number;
    readonly updatedAt: Date;
  }, tx?: ProjectionTransactionContext): Promise<Result<ProjectionState, ProjectionStateNotFound | ProjectionStateConcurrencyConflict>>;
}

export interface ProjectionEventReceiptRepository {
  hasReceipt(input: {
    readonly identity: ProjectionIdentity;
    readonly eventId: string;
  }, tx?: ProjectionTransactionContext): Promise<boolean>;
  insertReceipt(
    input: ProjectionEventReceiptInput,
    tx?: ProjectionTransactionContext
  ): Promise<Result<ProjectionReceiptInsertResult, ProjectionReceiptAlreadyExists>>;
}

export interface ProjectionRebuildReceiptRepository {
  hasReceipt(input: {
    readonly rebuildId: string;
    readonly identity: ProjectionIdentity;
    readonly eventId: string;
  }, tx?: ProjectionTransactionContext): Promise<boolean>;
  insertReceipt(
    input: ProjectionRebuildReceiptInput,
    tx?: ProjectionTransactionContext
  ): Promise<Result<ProjectionReceiptInsertResult, ProjectionReceiptAlreadyExists>>;
  countByRebuild(rebuildId: string, tx?: ProjectionTransactionContext): Promise<number>;
}
