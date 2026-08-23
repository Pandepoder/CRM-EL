import { ApplicationError, ErrorCategory } from "@tonala/shared/errors";
import {
  type CorrelationId,
  createCorrelationId,
  createEntityId,
  type EntityId,
  type Result,
  err,
  ok
} from "@tonala/shared/kernel";

export const Permission = {
  ContactsCreate: "contacts:create",
  ContactsRead: "contacts:read",
  TerritoryLink: "territory:link",
  AssignmentsCreate: "assignments:create",
  VisitsRead: "visits:read",
  VisitsSchedule: "visits:schedule",
  VisitsComplete: "visits:complete",
  DashboardRead: "dashboard:read"
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

/**
 * Known operational role names. Roles arrive as free-form strings from the
 * identity provider (or, in local/test, from request headers), so this is
 * not runtime-enforced the way Permission is — but centralizing the names
 * here means every module compares against the same constants instead of
 * duplicating string literals that can silently drift or typo.
 */
export const Role = {
  Admin: "admin",
  Direction: "direction",
  TerritorialCoordinator: "territorial_coordinator",
  Capturist: "capturist",
  VisitResponsible: "visit_responsible"
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export type AuthenticationMethod = "password" | "supabase" | "system" | "development";

export type ActorContext = Readonly<{
  actorId: EntityId;
  roles: readonly string[];
  permissions: ReadonlySet<Permission>;
  correlationId: CorrelationId;
  authenticationMethod: AuthenticationMethod;
  requestStartedAt: Date;
  isSystem: boolean;
}>;

export type AuthorizationDecision = Readonly<
  | { allowed: true }
  | { allowed: false; error: ApplicationError }
>;

export function createAuthenticatedActor(input: {
  readonly actorId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly Permission[];
  readonly correlationId: string;
  readonly authenticationMethod: Exclude<AuthenticationMethod, "system">;
  readonly requestStartedAt: Date;
}): ActorContext {
  return {
    actorId: createEntityId(input.actorId),
    roles: [...input.roles],
    permissions: new Set(input.permissions),
    correlationId: createCorrelationId(input.correlationId),
    authenticationMethod: input.authenticationMethod,
    requestStartedAt: input.requestStartedAt,
    isSystem: false
  };
}

export function createSystemActor(input: {
  readonly actorId: string;
  readonly permissions: readonly Permission[];
  readonly correlationId: string;
  readonly requestStartedAt: Date;
}): ActorContext {
  return {
    actorId: createEntityId(input.actorId),
    roles: ["system"],
    permissions: new Set(input.permissions),
    correlationId: createCorrelationId(input.correlationId),
    authenticationMethod: "system",
    requestStartedAt: input.requestStartedAt,
    isSystem: true
  };
}

export class PermissionChecker {
  public can(actor: ActorContext | undefined, permission: Permission): AuthorizationDecision {
    if (!actor) {
      return {
        allowed: false,
        error: new ApplicationError({
          code: "auth_context_required",
          category: ErrorCategory.Unauthorized,
          message: "Protected actions require an actor context.",
          publicMessage: "Authentication is required."
        })
      };
    }

    if (!actor.permissions.has(permission)) {
      return {
        allowed: false,
        error: new ApplicationError({
          code: "permission_denied",
          category: ErrorCategory.Forbidden,
          message: `Actor does not have permission ${permission}.`,
          publicMessage: "You do not have permission to perform this action.",
          diagnostic: { permission }
        })
      };
    }

    return { allowed: true };
  }
}

export function requirePermission(
  actor: ActorContext | undefined,
  permission: Permission,
  checker = new PermissionChecker()
): Result<ActorContext, ApplicationError> {
  const decision = checker.can(actor, permission);
  return decision.allowed ? ok(actor as ActorContext) : err(decision.error);
}
