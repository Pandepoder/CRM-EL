import { err, ok, type Result } from "@tonala/shared/kernel";

import {
  InvalidProjectionStatusTransition,
  ProjectionStateConcurrencyConflict,
} from "./persistence-errors.js";
import type { ProjectionReceiptAlreadyExists, ProjectionStateNotFound } from "./persistence-errors.js";
import {
  type ProjectionIdentity,
  projectionIdentityKey,
  ProjectionStatus,
  type ProjectionStatus as ProjectionStatusValue
} from "./identity.js";

export type ProjectionCheckpoint = Readonly<{
  eventId: string;
  eventCreatedAt: Date;
  processedAt: Date;
}>;

export type ProjectionState = Readonly<{
  identity: ProjectionIdentity;
  status: ProjectionStatusValue;
  checkpoint: ProjectionCheckpoint | null;
  rebuildStartedAt: Date | null;
  rebuildCompletedAt: Date | null;
  failureCount: number;
  lastError: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}>;

export type ProjectionStateTransitionResult =
  | Readonly<{ changed: true; status: ProjectionStatusValue }>
  | Readonly<{ changed: false; status: ProjectionStatusValue }>;

const allowedTransitions: Readonly<Record<ProjectionStatusValue, readonly ProjectionStatusValue[]>> = {
  [ProjectionStatus.Active]: [
    ProjectionStatus.Rebuilding,
    ProjectionStatus.Paused,
    ProjectionStatus.Failed,
    ProjectionStatus.Deprecated
  ],
  [ProjectionStatus.Rebuilding]: [
    ProjectionStatus.Active,
    ProjectionStatus.Paused,
    ProjectionStatus.Failed
  ],
  [ProjectionStatus.Paused]: [
    ProjectionStatus.Active,
    ProjectionStatus.Rebuilding,
    ProjectionStatus.Deprecated
  ],
  [ProjectionStatus.Failed]: [
    ProjectionStatus.Paused,
    ProjectionStatus.Rebuilding,
    ProjectionStatus.Deprecated
  ],
  [ProjectionStatus.Deprecated]: []
};

export function createProjectionCheckpoint(input: {
  readonly eventId: string;
  readonly eventCreatedAt: Date;
  readonly processedAt: Date;
}): Result<ProjectionCheckpoint, ProjectionStateConcurrencyConflict> {
  if (input.eventId.trim().length === 0) {
    return err(new ProjectionStateConcurrencyConflict("Projection checkpoint eventId cannot be empty."));
  }
  return ok({
    eventId: input.eventId,
    eventCreatedAt: input.eventCreatedAt,
    processedAt: input.processedAt
  });
}

export function transitionProjectionStatus(input: {
  readonly identity: ProjectionIdentity;
  readonly current: ProjectionStatusValue;
  readonly next: ProjectionStatusValue;
}): Result<ProjectionStateTransitionResult, InvalidProjectionStatusTransition> {
  if (input.current === input.next) {
    return ok({ changed: false, status: input.current });
  }
  if (allowedTransitions[input.current].includes(input.next)) {
    return ok({ changed: true, status: input.next });
  }
  return err(new InvalidProjectionStatusTransition({
    identityKey: projectionIdentityKey(input.identity),
    current: input.current,
    next: input.next
  }));
}

export type ProjectionStateMutationError =
  | ProjectionStateNotFound
  | ProjectionStateConcurrencyConflict
  | InvalidProjectionStatusTransition;

export type ProjectionReceiptInsertResult =
  | Readonly<{ inserted: true }>
  | Readonly<{ inserted: false; reason: "already_exists" }>;

export type ProjectionReceiptError = ProjectionReceiptAlreadyExists;
