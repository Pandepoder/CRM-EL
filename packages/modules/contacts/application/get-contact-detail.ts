import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { ApplicationError, ErrorCategory, type TonalaOsError } from "@tonala/shared/errors";
import { createEntityId } from "@tonala/shared/kernel";
import { err, ok } from "@tonala/shared/kernel";
import { measureOperation } from "@tonala/shared/observability";

import { type ContactDetail } from "../contracts/index.js";
import { type GetContactDetailDependencies, type UseCaseResult } from "./ports.js";

export type GetContactDetailInput = Readonly<{
  contactId: string;
}>;

export async function getContactDetail(
  actor: ActorContext,
  input: GetContactDetailInput,
  dependencies: GetContactDetailDependencies
): UseCaseResult<ContactDetail> {
  return measureOperation({
    actor,
    logger: dependencies.logger,
    operation: "contacts.getContactDetail",
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
        const isGlobalViewer = actor.roles.includes("admin") || actor.roles.includes("direction") || actor.isSystem;
        const scopedUserId = !isGlobalViewer ? actor.actorId : undefined;

        const entityId = createEntityId(input.contactId);
        const contact = await dependencies.contactsReader.getContactDetail(entityId, scopedUserId);
        
        if (!contact) {
          return err(new ApplicationError({
            code: "contact_not_found",
            category: ErrorCategory.NotFound,
            message: `Contact ${input.contactId} was not found.`,
            publicMessage: "El contacto no fue encontrado o no tienes permisos para acceder a él."
          }));
        }
        
        return ok(contact);
      } catch (error) {
        return err(error as TonalaOsError);
      }
    }
  });
}
