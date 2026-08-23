import { err, ok, type Result } from "@tonala/shared/kernel";

import { InvalidEventDescriptor } from "./errors.js";
import { createProjectionVersion, type ProjectionVersion } from "./identity.js";

export type ProjectionEventDescriptor = Readonly<{
  eventName: string;
  eventVersion: ProjectionVersion;
}>;

export type ProjectionEvent = Readonly<{
  eventId: string;
  eventName: string;
  eventVersion: ProjectionVersion;
  aggregateType: string;
  aggregateId: string;
  payload: Readonly<Record<string, unknown>>;
  metadata: Readonly<Record<string, unknown>>;
  createdAt: string;
}>;

export function createProjectionEventDescriptor(input: {
  readonly eventName: string;
  readonly eventVersion: string;
}): Result<ProjectionEventDescriptor, InvalidEventDescriptor> {
  const eventName = input.eventName.trim();
  if (eventName.length === 0) {
    return err(new InvalidEventDescriptor("Projection event name cannot be empty."));
  }
  const eventVersion = createProjectionVersion(input.eventVersion);
  if (!eventVersion.ok) {
    return err(new InvalidEventDescriptor(eventVersion.error.message));
  }
  return ok({ eventName, eventVersion: eventVersion.value });
}

export function projectionEventDescriptorKey(descriptor: ProjectionEventDescriptor): string {
  return `${descriptor.eventName}:${descriptor.eventVersion}`;
}

export function projectionEventMatchesDescriptor(
  event: ProjectionEvent,
  descriptor: ProjectionEventDescriptor
): boolean {
  return event.eventName === descriptor.eventName && event.eventVersion === descriptor.eventVersion;
}
