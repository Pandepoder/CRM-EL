import { type ActorContext } from "@tonala/shared/auth";
import { ApplicationError, ErrorCategory } from "@tonala/shared/errors";

import { createDevelopmentActorFromHeaders } from "../dev-actor.js";

export interface HttpActorProvider {
  actorForRequest(request: Request): ActorContext;
}

export type DevelopmentActorEnv = Readonly<{
  NEXT_PUBLIC_APP_ENV?: string;
}>;

export type HttpActorDependencies = Readonly<
  | { actorProvider: HttpActorProvider }
  | { env: DevelopmentActorEnv }
>;

export function actorFromRequest(
  request: Request,
  dependencies: HttpActorDependencies
): ActorContext {
  if ("actorProvider" in dependencies) {
    return dependencies.actorProvider.actorForRequest(request);
  }

  if ("env" in dependencies) {
    return createDevelopmentActorFromHeaders(request.headers, dependencies.env);
  }

  throw new ApplicationError({
    code: "actor_provider_required",
    category: ErrorCategory.Infrastructure,
    message: "HTTP actor provider is not configured.",
    publicMessage: "Authentication is not available."
  });
}

export function createDevelopmentHttpActorProvider(env: DevelopmentActorEnv): HttpActorProvider {
  return {
    actorForRequest: (request) => createDevelopmentActorFromHeaders(request.headers, env)
  };
}
