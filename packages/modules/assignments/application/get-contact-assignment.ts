import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { type TonalaOsError } from "@tonala/shared/errors";
import { createEntityId, err, ok } from "@tonala/shared/kernel";
import { measureOperation } from "@tonala/shared/observability";

import { type ContactAssignmentSummary } from "../contracts/index.js";
import { notFoundError } from "./errors.js";
import { type GetContactAssignmentDependencies, type UseCaseResult } from "./ports.js";

export type GetContactAssignmentInput = Readonly<{ contactId: string }>;

export async function getContactAssignment(
  actor: ActorContext,
  input: GetContactAssignmentInput,
  dependencies: GetContactAssignmentDependencies
): UseCaseResult<ContactAssignmentSummary> {
  return measureOperation({
    actor,
    logger: dependencies.logger,
    operation: "assignments.getContactAssignment",
    run: async () => {
      const authorization = requirePermission(actor, Permission.ContactsRead, dependencies.permissionChecker);
      if (!authorization.ok) return err(authorization.error);

      try {
        const assignment = await dependencies.contactAssignmentRepository.findByContactId(
          createEntityId(input.contactId)
        );
        if (!assignment) {
          return err(notFoundError(
            "contact_assignment_not_found",
            `Contact assignment for contact ${input.contactId} was not found.`,
            "Contact assignment was not found."
          ));
        }
        return ok(assignment);
      } catch (error) {
        return err(error as TonalaOsError);
      }
    }
  });
}
