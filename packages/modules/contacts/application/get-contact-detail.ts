import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { ApplicationError, ErrorCategory, type TonalaOsError } from "@tonala/shared/errors";
import { createEntityId } from "@tonala/shared/kernel";
import { err, ok } from "@tonala/shared/kernel";
import { measureOperation } from "@tonala/shared/observability";

import { type ContactDetail } from "../contracts/index.js";
import { type GetContactDetailDependencies, type UseCaseResult } from "./ports.js";

export type GetContactDetailInput = Readonly<{
  contactId: string;
  /** Usuarios cuyo trabajo puede ver quien consulta; lo calcula la capa web. */
  scopedUserIds?: readonly string[];
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
        // Solo administración ve cualquier ficha. Dirección y los líderes ven las
        // de su equipo, que llegan en `scopedUserIds` desde la capa web.
        const isGlobalViewer = actor.roles.includes("admin") || actor.isSystem;
        const scopedUserIds = isGlobalViewer
          ? undefined
          : (input.scopedUserIds && input.scopedUserIds.length > 0
              ? input.scopedUserIds
              : [actor.actorId]
            ).map((id) => createEntityId(id));

        const entityId = createEntityId(input.contactId);
        const contact = await dependencies.contactsReader.getContactDetail(entityId, scopedUserIds);
        
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
