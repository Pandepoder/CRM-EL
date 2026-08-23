import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { type TonalaOsError } from "@tonala/shared/errors";
import { createEntityId, err, ok } from "@tonala/shared/kernel";
import { measureOperation } from "@tonala/shared/observability";

import { type VisitListItem } from "../contracts/index.js";
import { type ListVisitsByContactDependencies, type UseCaseResult } from "./ports.js";

export type ListVisitsByContactInput = Readonly<{
  contactId: string;
}>;

export async function listVisitsByContact(
  actor: ActorContext,
  input: ListVisitsByContactInput,
  dependencies: ListVisitsByContactDependencies
): UseCaseResult<VisitListItem[]> {
  return measureOperation({
    actor,
    logger: dependencies.logger,
    operation: "visits.listVisitsByContact",
    run: async () => {
      const authorization = requirePermission(
        actor,
        Permission.VisitsRead,
        dependencies.permissionChecker
      );
      if (!authorization.ok) return err(authorization.error);

      try {
        const visits = await dependencies.visitsReader.listVisitsByContact(
          createEntityId(input.contactId)
        );
        return ok(visits);
      } catch (error) {
        return err(error as TonalaOsError);
      }
    }
  });
}
