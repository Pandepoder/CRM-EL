import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { err, ok, type Result } from "@tonala/shared/kernel";
import { type TonalaOsError } from "@tonala/shared/errors";
import { type PermissionChecker } from "@tonala/shared/auth";
import { LogLevel, type Logger } from "@tonala/shared/observability";

import type { OperationalSummary, OperationalSummaryReader } from "../contracts/operational-summary.js";

export type GetOperationalSummaryDependencies = Readonly<{
  summaryReader: OperationalSummaryReader;
  permissionChecker: PermissionChecker;
  logger: Logger;
}>;

export async function getOperationalSummary(
  actor: ActorContext,
  dependencies: GetOperationalSummaryDependencies
): Promise<Result<OperationalSummary, TonalaOsError>> {
  const authorization = requirePermission(
    actor,
    Permission.DashboardRead,
    dependencies.permissionChecker
  );
  if (!authorization.ok) {
    return err(authorization.error);
  }

  try {
    const summary = await dependencies.summaryReader.getSummary();
    return ok(summary);
  } catch (error) {
    dependencies.logger.log(LogLevel.Error, "Failed to load operational summary", {
      operation: "commandCenter.getOperationalSummary",
      errorCode: error instanceof Error ? error.name : "unknown_error"
    });
    throw error;
  }
}
