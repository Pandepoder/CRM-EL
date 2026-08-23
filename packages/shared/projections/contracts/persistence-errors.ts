import { ApplicationError, ErrorCategory } from "@tonala/shared/errors";

import { type ProjectionStatus } from "./identity.js";

export class ProjectionStateNotFound extends ApplicationError {
  public constructor(identityKey: string) {
    super({
      code: "projection_state_not_found",
      category: ErrorCategory.NotFound,
      message: `Projection state ${identityKey} was not found.`,
      publicMessage: "Projection state was not found."
    });
    this.name = "ProjectionStateNotFound";
  }
}

export class InvalidProjectionStatusTransition extends ApplicationError {
  public constructor(input: {
    readonly identityKey: string;
    readonly current: ProjectionStatus;
    readonly next: ProjectionStatus;
  }) {
    super({
      code: "invalid_projection_status_transition",
      category: ErrorCategory.Conflict,
      message: `Projection ${input.identityKey} cannot transition from ${input.current} to ${input.next}.`,
      publicMessage: "Projection status transition is invalid."
    });
    this.name = "InvalidProjectionStatusTransition";
  }
}

export class ProjectionStateConcurrencyConflict extends ApplicationError {
  public constructor(message = "Projection state version did not match expected version.") {
    super({
      code: "projection_state_concurrency_conflict",
      category: ErrorCategory.Conflict,
      message,
      publicMessage: "Projection state was modified concurrently."
    });
    this.name = "ProjectionStateConcurrencyConflict";
  }
}

export class ProjectionReceiptAlreadyExists extends ApplicationError {
  public constructor(message = "Projection receipt already exists.") {
    super({
      code: "projection_receipt_already_exists",
      category: ErrorCategory.Conflict,
      message,
      publicMessage: "Projection receipt already exists."
    });
    this.name = "ProjectionReceiptAlreadyExists";
  }
}
