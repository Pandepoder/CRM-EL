import { DomainError } from "@tonala/shared/errors";
import { type EntityId } from "@tonala/shared/kernel";

export const VisitStatus = {
  Scheduled: "scheduled",
  Completed: "completed"
} as const;
export type VisitStatus = (typeof VisitStatus)[keyof typeof VisitStatus];

export const VisitOutcome = {
  Successful: "successful",
  NoContact: "no_contact",
  FollowUpRequired: "follow_up_required",
  Rejected: "rejected"
} as const;
export type VisitOutcome = (typeof VisitOutcome)[keyof typeof VisitOutcome];

export const visitLocationTextMaxLength = 240;
export const visitSummaryMaxLength = 1000;

export type Visit = Readonly<{
  visitId: EntityId;
  contactId: EntityId;
  colonyId: EntityId;
  assignedUserId: EntityId;
  scheduledAt: Date;
  status: VisitStatus;
  visitLocationText: string;
  createdByUserId: EntityId;
  createdAt: Date;
  completedAt: Date | null;
  completedByUserId: EntityId | null;
  version: number;
}>;

export type VisitResult = Readonly<{
  visitId: EntityId;
  structuredOutcome: VisitOutcome;
  summary: string;
  completedByUserId: EntityId;
  completedAt: Date;
}>;

export function normalizeVisitText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function createVisitLocationText(value: string): string {
  const normalized = normalizeVisitText(value);
  if (normalized.length === 0) {
    throw new DomainError({
      code: "visit_location_required",
      message: "Visit location text is required.",
      publicMessage: "Visit location is required."
    });
  }
  if (normalized.length > visitLocationTextMaxLength) {
    throw new DomainError({
      code: "visit_location_too_long",
      message: `Visit location text must be ${visitLocationTextMaxLength} characters or less.`,
      publicMessage: "Visit location is too long."
    });
  }
  return normalized;
}

export function createVisitSummary(value: string): string {
  const normalized = normalizeVisitText(value);
  if (normalized.length === 0) {
    throw new DomainError({
      code: "visit_summary_required",
      message: "Visit summary is required.",
      publicMessage: "Visit summary is required."
    });
  }
  if (normalized.length > visitSummaryMaxLength) {
    throw new DomainError({
      code: "visit_summary_too_long",
      message: `Visit summary must be ${visitSummaryMaxLength} characters or less.`,
      publicMessage: "Visit summary is too long."
    });
  }
  return normalized;
}

export function createVisit(input: {
  readonly visitId: EntityId;
  readonly contactId: EntityId;
  readonly colonyId: EntityId;
  readonly assignedUserId: EntityId;
  readonly scheduledAt: Date;
  readonly visitLocationText: string;
  readonly createdByUserId: EntityId;
  readonly createdAt: Date;
}): Visit {
  return {
    visitId: input.visitId,
    contactId: input.contactId,
    colonyId: input.colonyId,
    assignedUserId: input.assignedUserId,
    scheduledAt: input.scheduledAt,
    status: VisitStatus.Scheduled,
    visitLocationText: createVisitLocationText(input.visitLocationText),
    createdByUserId: input.createdByUserId,
    createdAt: input.createdAt,
    completedAt: null,
    completedByUserId: null,
    version: 1
  };
}

export function assertVisitCanComplete(visit: Visit): void {
  if (visit.status !== VisitStatus.Scheduled) {
    throw new DomainError({
      code: "visit_already_completed",
      message: `Visit ${visit.visitId} cannot be completed from status ${visit.status}.`,
      publicMessage: "Visit cannot be completed again."
    });
  }
}

export function createCompletedVisit(
  visit: Visit,
  input: {
    readonly completedAt: Date;
    readonly completedByUserId: EntityId;
  }
): Visit {
  assertVisitCanComplete(visit);
  return {
    ...visit,
    status: VisitStatus.Completed,
    completedAt: input.completedAt,
    completedByUserId: input.completedByUserId,
    version: visit.version + 1
  };
}

export function createVisitResult(input: {
  readonly visitId: EntityId;
  readonly structuredOutcome: string;
  readonly summary: string;
  readonly completedByUserId: EntityId;
  readonly completedAt: Date;
}): VisitResult {
  if (!isVisitOutcome(input.structuredOutcome)) {
    throw new DomainError({
      code: "visit_outcome_invalid",
      message: `Visit outcome ${input.structuredOutcome} is not allowed.`,
      publicMessage: "Visit outcome is invalid."
    });
  }

  return {
    visitId: input.visitId,
    structuredOutcome: input.structuredOutcome,
    summary: createVisitSummary(input.summary),
    completedByUserId: input.completedByUserId,
    completedAt: input.completedAt
  };
}

export function isVisitOutcome(value: string): value is VisitOutcome {
  return Object.values(VisitOutcome).includes(value as VisitOutcome);
}
