import {
  type ProjectionDefinition,
  type ProjectionIdentity,
  type ProjectionTransactionContext,
  projectionIdentityKey
} from "../contracts/index.js";
import { ProjectionRuntimeBindingNotFound } from "./live-errors.js";

export type ProjectionRuntimeBinding<TPorts = unknown> = Readonly<{
  definition: ProjectionDefinition<TPorts>;
  resolvePorts(input: {
    readonly tx: ProjectionTransactionContext;
    readonly identity: ProjectionIdentity;
  }): TPorts | Promise<TPorts>;
}>;

export class ProjectionRuntimeRegistry {
  private readonly bindings = new Map<string, ProjectionRuntimeBinding<unknown>>();

  public register<TPorts>(binding: ProjectionRuntimeBinding<TPorts>): void {
    const key = projectionIdentityKey(binding.definition.identity);
    if (this.bindings.has(key)) {
      throw new ProjectionRuntimeBindingNotFound(`duplicate:${key}`);
    }
    this.bindings.set(key, binding);
  }

  public bindingFor(identity: ProjectionIdentity): ProjectionRuntimeBinding<unknown> | null {
    return this.bindings.get(projectionIdentityKey(identity)) ?? null;
  }

  public requireBinding(identity: ProjectionIdentity): ProjectionRuntimeBinding<unknown> {
    const binding = this.bindingFor(identity);
    if (!binding) throw new ProjectionRuntimeBindingNotFound(projectionIdentityKey(identity));
    return binding;
  }
}

export interface ProjectionTransactionManager {
  transaction<T>(run: (tx: ProjectionTransactionContext) => Promise<T>): Promise<T>;
}
