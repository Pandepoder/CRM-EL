import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { ApplicationError, ErrorCategory, type TonalaOsError } from "@tonala/shared/errors";
import { createEntityId } from "@tonala/shared/kernel";
import { err, ok } from "@tonala/shared/kernel";
import { measureOperation } from "@tonala/shared/observability";

import { type ContactSummary } from "../contracts/index.js";
import { type GetContactByIdDependencies, type UseCaseResult } from "./ports.js";

export type GetContactByIdInput = Readonly<{
  contactId: string;
}>;

export async function getContactById(
  actor: ActorContext,
  input: GetContactByIdInput,
  dependencies: GetContactByIdDependencies
): UseCaseResult<ContactSummary> {
  return measureOperation({
    actor,
    logger: dependencies.logger,
    operation: "contacts.getContactById",
    run: async () => {
      const authorization = requirePermission(
        actor,
        Permission.ContactsRead,
        dependencies.permissionChecker
      );
      if (!authorization.ok) {
        return err(authorization.error);
      }

      try {
        const contact = await dependencies.contactRepository.findById(createEntityId(input.contactId));
        if (!contact) {
          return err(new ApplicationError({
            code: "contact_not_found",
            category: ErrorCategory.NotFound,
            message: `Contact ${input.contactId} was not found.`,
            publicMessage: "Contact was not found."
          }));
        }
        return ok(contact);
      } catch (error) {
        return err(error as TonalaOsError);
      }
    }
  });
}
