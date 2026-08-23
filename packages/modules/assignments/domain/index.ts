import { DomainError } from "@tonala/shared/errors";
import { type EntityId } from "@tonala/shared/kernel";

export const AssignmentStatus = {
  Active: "active",
  Pending: "pending"
} as const;

export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export type ContactAssignment = Readonly<{
  contactId: EntityId;
  assignedUserId: EntityId;
  assignmentStatus: AssignmentStatus;
  assignedByUserId: EntityId;
  assignedAt: Date;
  version: number;
}>;

export function createInitialContactAssignment(input: {
  readonly contactId: EntityId;
  readonly assignedUserId: EntityId;
  readonly assignedByUserId: EntityId;
  readonly assignedAt: Date;
  readonly status?: AssignmentStatus;
}): ContactAssignment {
  return {
    contactId: input.contactId,
    assignedUserId: input.assignedUserId,
    assignmentStatus: input.status ?? AssignmentStatus.Active,
    assignedByUserId: input.assignedByUserId,
    assignedAt: input.assignedAt,
    version: 1
  };
}

/** Para cuando un capturista registra el contacto sin responsable asignado todavía. */
export function createPendingContactAssignment(input: {
  readonly contactId: EntityId;
  readonly assignedByUserId: EntityId;
  readonly assignedAt: Date;
  /** El ID del usuario "pendiente" puede ser el propio actor o un placeholder; el dominio solo fuerza el estado. */
  readonly assignedUserId: EntityId;
}): ContactAssignment {
  return createInitialContactAssignment({ ...input, status: AssignmentStatus.Pending });
}

export function reassignContact(
  current: ContactAssignment,
  input: {
    readonly assignedUserId: EntityId;
    readonly assignedByUserId: EntityId;
    readonly assignedAt: Date;
  }
): ContactAssignment {
  if (current.version < 1) {
    throw new DomainError({
      code: "invalid_contact_assignment_version",
      message: "Contact assignment version must be greater than or equal to 1.",
      publicMessage: "Assignment state is invalid."
    });
  }

  return {
    contactId: current.contactId,
    assignedUserId: input.assignedUserId,
    assignmentStatus: AssignmentStatus.Active,
    assignedByUserId: input.assignedByUserId,
    assignedAt: input.assignedAt,
    version: current.version + 1
  };
}
