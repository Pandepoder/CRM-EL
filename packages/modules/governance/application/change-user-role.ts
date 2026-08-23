import { eq } from "drizzle-orm";
import { type Database, schema } from "@tonala/shared/database";
import {
  Permission,
  Role,
  requirePermission,
  type ActorContext,
  type PermissionChecker
} from "@tonala/shared/auth";
import { ApplicationError, ErrorCategory, type TonalaOsError } from "@tonala/shared/errors";
import { err, ok, type Result } from "@tonala/shared/kernel";

export type ChangeUserRoleInput = Readonly<{
  userId: string;
  roleId: string;
}>;

export type ChangeUserRoleDependencies = Readonly<{
  db: Database;
  permissionChecker: PermissionChecker;
}>;

export async function changeUserRole(
  actor: ActorContext,
  input: ChangeUserRoleInput,
  dependencies: ChangeUserRoleDependencies
): Promise<Result<{ ok: true }, TonalaOsError>> {
  if (!actor.roles.includes(Role.Admin)) {
    return err(
      new ApplicationError({
        code: "forbidden",
        category: ErrorCategory.Forbidden,
        message: "Only admins can change user roles.",
        publicMessage: "Solo administradores pueden cambiar roles."
      })
    );
  }

  const authorization = requirePermission(
    actor,
    Permission.DashboardRead,
    dependencies.permissionChecker
  );
  if (!authorization.ok) {
    return err(authorization.error);
  }

  await dependencies.db
    .update(schema.userProfiles)
    .set({ roleId: input.roleId })
    .where(eq(schema.userProfiles.id, input.userId));

  return ok({ ok: true });
}
