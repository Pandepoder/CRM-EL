import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { type TonalaOsError } from "@tonala/shared/errors";
import { err, ok } from "@tonala/shared/kernel";
import { measureOperation } from "@tonala/shared/observability";

import { type MyDayVisit } from "../contracts/index.js";
import { type ListVisitsForUserDependencies, type UseCaseResult } from "./ports.js";

export type ListVisitsForUserInput = Readonly<{
  userId: string;
  onlyToday?: boolean;
}>;

export async function listVisitsForUser(
  actor: ActorContext,
  input: ListVisitsForUserInput,
  dependencies: ListVisitsForUserDependencies
): UseCaseResult<MyDayVisit[]> {
  return measureOperation({
    actor,
    logger: dependencies.logger,
    operation: "visits.listVisitsForUser",
    run: async () => {
      const authorization = requirePermission(
        actor,
        Permission.VisitsRead,
        dependencies.permissionChecker
      );
      if (!authorization.ok) return err(authorization.error);

      try {
        const visits = await dependencies.visitsReader.listVisitsForUser(
          input.userId,
          input.onlyToday ?? false
        );
        return ok(visits);
      } catch (error) {
        return err(error as TonalaOsError);
      }
    }
  });
}
