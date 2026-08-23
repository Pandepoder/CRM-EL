import {
  DuplicateProjectionIdentity,
  projectionEventDescriptorKey,
  projectionEventMatchesDescriptor,
  compareProjectionIdentity,
  type ProjectionDefinition,
  type ProjectionEvent,
  type ProjectionEventDescriptor,
  type ProjectionIdentity,
  projectionIdentityKey,
  validateSupportedEvents
} from "../contracts/index.js";

export class ProjectionRegistry {
  private readonly definitions = new Map<string, ProjectionDefinition<unknown>>();

  public register<TPorts>(definition: ProjectionDefinition<TPorts>): void {
    validateSupportedEvents(definition.supportedEvents);
    const key = projectionIdentityKey(definition.identity);
    if (this.definitions.has(key)) {
      throw new DuplicateProjectionIdentity(key);
    }
    this.definitions.set(key, definition);
  }

  public all(): readonly ProjectionDefinition<unknown>[] {
    return this.sortedDefinitions();
  }

  public active(input: {
    readonly isActive: (identity: ProjectionIdentity) => boolean;
  }): readonly ProjectionDefinition<unknown>[] {
    return this.sortedDefinitions().filter((definition) => input.isActive(definition.identity));
  }

  public projectionsForEvent(event: ProjectionEvent): readonly ProjectionDefinition<unknown>[] {
    return this.sortedDefinitions().filter((definition) =>
      definition.supportedEvents.some((descriptor) => projectionEventMatchesDescriptor(event, descriptor))
    );
  }

  public projectionsForDescriptor(descriptor: ProjectionEventDescriptor): readonly ProjectionDefinition<unknown>[] {
    const descriptorKey = projectionEventDescriptorKey(descriptor);
    return this.sortedDefinitions().filter((definition) =>
      definition.supportedEvents.some((supported) => projectionEventDescriptorKey(supported) === descriptorKey)
    );
  }

  private sortedDefinitions(): readonly ProjectionDefinition<unknown>[] {
    return [...this.definitions.values()].sort((left, right) =>
      compareProjectionIdentity(left.identity, right.identity)
    );
  }
}
