import { ApplicationError, ErrorCategory } from "@tonala/shared/errors";

export class InvalidProjectionName extends ApplicationError {
  public constructor(message: string) {
    super({
      code: "invalid_projection_name",
      category: ErrorCategory.Validation,
      message,
      publicMessage: "Projection name is invalid."
    });
    this.name = "InvalidProjectionName";
  }
}

export class InvalidProjectionVersion extends ApplicationError {
  public constructor(message: string) {
    super({
      code: "invalid_projection_version",
      category: ErrorCategory.Validation,
      message,
      publicMessage: "Projection version is invalid."
    });
    this.name = "InvalidProjectionVersion";
  }
}

export class InvalidEventDescriptor extends ApplicationError {
  public constructor(message: string) {
    super({
      code: "invalid_event_descriptor",
      category: ErrorCategory.Validation,
      message,
      publicMessage: "Projection event descriptor is invalid."
    });
    this.name = "InvalidEventDescriptor";
  }
}

export class EmptySupportedEvents extends ApplicationError {
  public constructor() {
    super({
      code: "empty_supported_events",
      category: ErrorCategory.Validation,
      message: "Projection definitions must support at least one event.",
      publicMessage: "Projection definition must support at least one event."
    });
    this.name = "EmptySupportedEvents";
  }
}

export class DuplicateSupportedEvent extends ApplicationError {
  public constructor(descriptorKey: string) {
    super({
      code: "duplicate_supported_event",
      category: ErrorCategory.Conflict,
      message: `Projection definition contains duplicate event descriptor ${descriptorKey}.`,
      publicMessage: "Projection definition contains a duplicated event."
    });
    this.name = "DuplicateSupportedEvent";
  }
}

export class DuplicateProjectionIdentity extends ApplicationError {
  public constructor(identityKey: string) {
    super({
      code: "duplicate_projection_identity",
      category: ErrorCategory.Conflict,
      message: `Projection identity ${identityKey} is already registered.`,
      publicMessage: "Projection identity is duplicated."
    });
    this.name = "DuplicateProjectionIdentity";
  }
}
