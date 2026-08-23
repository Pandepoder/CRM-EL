import { ApplicationError, ErrorCategory } from "@tonala/shared/errors";

export type ProjectionLiveFailureKind =
  | "transient"
  | "concurrency"
  | "handler"
  | "incompatible_event"
  | "configuration"
  | "projection_blocked"
  | "persistence";

export class ProjectionRuntimeBindingNotFound extends ApplicationError {
  public readonly retryable = false;
  public readonly failureKind: ProjectionLiveFailureKind = "configuration";

  public constructor(identityKey: string) {
    super({
      code: "projection_runtime_binding_not_found",
      category: ErrorCategory.Conflict,
      message: `Projection runtime binding ${identityKey} was not found.`,
      publicMessage: "Projection runtime binding is missing."
    });
    this.name = "ProjectionRuntimeBindingNotFound";
  }
}

export class ProjectionLiveProcessingFailed extends ApplicationError {
  public readonly retryable: boolean;
  public readonly failureKind: ProjectionLiveFailureKind;

  public constructor(input: {
    readonly code: string;
    readonly message: string;
    readonly publicMessage?: string;
    readonly retryable: boolean;
    readonly failureKind: ProjectionLiveFailureKind;
    readonly cause?: unknown;
  }) {
    super({
      code: input.code,
      category: ErrorCategory.Infrastructure,
      message: input.message,
      publicMessage: input.publicMessage ?? "Projection live processing failed.",
      cause: input.cause
    });
    this.name = "ProjectionLiveProcessingFailed";
    this.retryable = input.retryable;
    this.failureKind = input.failureKind;
  }
}

export class ProjectionProcessingBlocked extends ApplicationError {
  public readonly retryable: boolean;
  public readonly failureKind: ProjectionLiveFailureKind = "projection_blocked";

  public constructor(input: {
    readonly code: string;
    readonly message: string;
    readonly retryable: boolean;
  }) {
    super({
      code: input.code,
      category: ErrorCategory.Conflict,
      message: input.message,
      publicMessage: "Projection processing is currently blocked."
    });
    this.name = "ProjectionProcessingBlocked";
    this.retryable = input.retryable;
  }
}

export class ProjectionHandlerFailed extends ApplicationError {
  public readonly retryable = true;
  public readonly failureKind: ProjectionLiveFailureKind = "handler";

  public constructor(message: string, cause?: unknown) {
    super({
      code: "projection_handler_failed",
      category: ErrorCategory.Infrastructure,
      message,
      publicMessage: "Projection handler failed.",
      cause
    });
    this.name = "ProjectionHandlerFailed";
  }
}

export class InvalidProjectionEvent extends ApplicationError {
  public readonly retryable = false;
  public readonly failureKind: ProjectionLiveFailureKind = "incompatible_event";

  public constructor(message: string) {
    super({
      code: "invalid_projection_event",
      category: ErrorCategory.Validation,
      message,
      publicMessage: "Projection event is invalid."
    });
    this.name = "InvalidProjectionEvent";
  }
}

export class ProjectionTransactionFailed extends ApplicationError {
  public readonly retryable = true;
  public readonly failureKind: ProjectionLiveFailureKind = "persistence";

  public constructor(message: string, cause?: unknown) {
    super({
      code: "projection_transaction_failed",
      category: ErrorCategory.Infrastructure,
      message,
      publicMessage: "Projection transaction failed.",
      cause
    });
    this.name = "ProjectionTransactionFailed";
  }
}
