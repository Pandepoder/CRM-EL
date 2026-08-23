import { type Logger } from "@tonala/shared/observability";

import {
  DuplicateSupportedEvent,
  EmptySupportedEvents
} from "./errors.js";
import { type ProjectionEvent, projectionEventDescriptorKey, type ProjectionEventDescriptor } from "./events.js";
import { type ProjectionIdentity, type ProjectionMode } from "./identity.js";

export type RebuildPolicy = Readonly<{
  rebuildable: boolean;
  source: "outbox_history";
  strategy: "shadow";
}>;

export type ProjectionExecutionContext = Readonly<{
  projectionIdentity: ProjectionIdentity;
  mode: ProjectionMode;
  workerId: string;
  correlationId: string;
  attempt: number;
  processingStartedAt: Date;
  rebuildId?: string | null;
  logger: Logger;
}>;

export type ProjectionHandlerResult = Readonly<{
  resultMetadata?: Readonly<Record<string, unknown>>;
}>;

export type ProjectionDefinition<TPorts = unknown> = Readonly<{
  identity: ProjectionIdentity;
  supportedEvents: readonly ProjectionEventDescriptor[];
  rebuildPolicy: RebuildPolicy;
  handle(
    event: ProjectionEvent,
    context: ProjectionExecutionContext,
    ports: TPorts
  ): Promise<ProjectionHandlerResult | void>;
}>;

export function createProjectionDefinition<TPorts>(
  definition: ProjectionDefinition<TPorts>
): ProjectionDefinition<TPorts> {
  validateSupportedEvents(definition.supportedEvents);
  return definition;
}

export function validateSupportedEvents(events: readonly ProjectionEventDescriptor[]): void {
  if (events.length === 0) {
    throw new EmptySupportedEvents();
  }
  const seen = new Set<string>();
  for (const event of events) {
    const key = projectionEventDescriptorKey(event);
    if (seen.has(key)) {
      throw new DuplicateSupportedEvent(key);
    }
    seen.add(key);
  }
}
