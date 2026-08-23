import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { type TonalaOsError } from "@tonala/shared/errors";
import { createEntityId, err, ok } from "@tonala/shared/kernel";
import { measureOperation } from "@tonala/shared/observability";

import { type VisitSummaryView } from "../contracts/index.js";
import { notFoundError } from "./errors.js";
import { type GetVisitByIdDependencies, type UseCaseResult } from "./ports.js";

export type GetVisitByIdInput = Readonly<{ visitId: string }>;

export async function getVisitById(
  actor: ActorContext,
  input: GetVisitByIdInput,
  dependencies: GetVisitByIdDependencies
): UseCaseResult<VisitSummaryView> {
  return measureOperation({
    actor,
    logger: dependencies.logger,
    operation: "visits.getVisitById",
    run: async () => {
      const authorization = requirePermission(actor, Permission.ContactsRead, dependencies.permissionChecker);
      if (!authorization.ok) return err(authorization.error);
      try {
        const visit = await dependencies.visitRepository.findById(createEntityId(input.visitId));
        if (!visit) {
          return err(notFoundError("visit_not_found", `Visit ${input.visitId} was not found.`, "Visit was not found."));
        }
        return ok(visit);
      } catch (error) {
        return err(error as TonalaOsError);
      }
    }
  });
}
