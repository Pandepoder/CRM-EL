import {
  Permission,
  createAuthenticatedActor,
  type ActorContext,
  type Permission as PermissionValue
} from "@tonala/shared/auth";
import { ApplicationError, ErrorCategory } from "@tonala/shared/errors";

const allowedEnvironments = new Set(["local", "test"]);
const permissionValues = new Set<string>(Object.values(Permission));

export function createDevelopmentActorFromHeaders(
  headers: Headers,
  env: { readonly NEXT_PUBLIC_APP_ENV?: string }
): ActorContext {
  if (!allowedEnvironments.has(env.NEXT_PUBLIC_APP_ENV ?? "")) {
    throw new ApplicationError({
      code: "development_actor_not_allowed",
      category: ErrorCategory.Forbidden,
      message: "Development actor adapter can only run in local/test environments.",
      publicMessage: "Development authentication is not available."
    });
  }

  const actorId = requiredHeader(headers, "x-tonala-actor-id");
  const correlationId = headers.get("x-correlation-id") ?? crypto.randomUUID();
  const roles = splitHeader(headers.get("x-tonala-roles"));
  const permissions = splitHeader(headers.get("x-tonala-permissions"));

  const invalidPermission = permissions.find((permission) => !permissionValues.has(permission));
  if (invalidPermission) {
    throw new ApplicationError({
      code: "invalid_development_permission",
      category: ErrorCategory.Validation,
      message: `Invalid development permission: ${invalidPermission}`,
      publicMessage: "Invalid development authentication context."
    });
  }

  return createAuthenticatedActor({
    actorId,
    roles,
    permissions: permissions as PermissionValue[],
    correlationId,
    authenticationMethod: "development",
    requestStartedAt: new Date()
  });
}

function requiredHeader(headers: Headers, name: string): string {
  const value = headers.get(name);
  if (!value) {
    throw new ApplicationError({
      code: "missing_development_actor_header",
      category: ErrorCategory.Unauthorized,
      message: `Missing required development actor header ${name}.`,
      publicMessage: "Authentication is required."
    });
  }
  return value;
}

function splitHeader(value: string | null): string[] {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}
