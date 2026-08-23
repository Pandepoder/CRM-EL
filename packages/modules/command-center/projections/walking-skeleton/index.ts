import {
  createProjectionDefinition,
  createProjectionEventDescriptor,
  createProjectionIdentity,
  createProjectionName,
  createProjectionVersion,
  type ProjectionEvent,
  type RebuildPolicy
} from "@tonala/shared/projections";

export interface WalkingSkeletonProjectionWriter {
  incrementContactRegistered(eventCreatedAt: Date): Promise<void>;
  incrementContactLinked(eventCreatedAt: Date): Promise<void>;
  incrementResponsibleAssigned(eventCreatedAt: Date): Promise<void>;
  incrementVisitScheduled(eventCreatedAt: Date): Promise<void>;
  incrementVisitCompleted(eventCreatedAt: Date): Promise<void>;
}

const projectionName = createProjectionName("walking_skeleton");
const projectionVersion = createProjectionVersion("v1");
if (!projectionName.ok) throw projectionName.error;
if (!projectionVersion.ok) throw projectionVersion.error;

const rebuildPolicy: RebuildPolicy = {
  rebuildable: true,
  source: "outbox_history",
  strategy: "shadow"
};

export const walkingSkeletonProjectionIdentity = createProjectionIdentity({
  projectionName: projectionName.value,
  projectionVersion: projectionVersion.value
});

export const walkingSkeletonProjection = createProjectionDefinition<WalkingSkeletonProjectionWriter>({
  identity: walkingSkeletonProjectionIdentity,
  supportedEvents: [
    descriptor("ContactRegistered", "v1"),
    descriptor("ContactLinkedToColony", "v1"),
    descriptor("ResponsibleAssigned", "v1"),
    descriptor("VisitScheduled", "v1"),
    descriptor("VisitCompleted", "v1")
  ],
  rebuildPolicy,
  handle: async (event, _context, writer) => {
    const eventCreatedAt = new Date(event.createdAt);
    switch (event.eventName) {
      case "ContactRegistered":
        await writer.incrementContactRegistered(eventCreatedAt);
        return;
      case "ContactLinkedToColony":
        await writer.incrementContactLinked(eventCreatedAt);
        return;
      case "ResponsibleAssigned":
        await writer.incrementResponsibleAssigned(eventCreatedAt);
        return;
      case "VisitScheduled":
        await writer.incrementVisitScheduled(eventCreatedAt);
        return;
      case "VisitCompleted":
        await writer.incrementVisitCompleted(eventCreatedAt);
        return;
      default:
        return;
    }
  }
});

function descriptor(eventName: string, eventVersion: string) {
  const result = createProjectionEventDescriptor({ eventName, eventVersion });
  if (!result.ok) throw result.error;
  return result.value;
}

export function isWalkingSkeletonSupportedEvent(event: ProjectionEvent): boolean {
  return walkingSkeletonProjection.supportedEvents.some((supported) =>
    supported.eventName === event.eventName && supported.eventVersion === event.eventVersion
  );
}
