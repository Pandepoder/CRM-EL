import { Permission, Role, requirePermission, type ActorContext } from "@tonala/shared/auth";
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
  /** Un administrador municipal: su municipio (o `null` si sigue sin uno). */
  scopedAdministration?: Readonly<{ municipalityId: string | null }>;
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
        // Solo el administrador maestro ve todo (etapa 6). Un administrador municipal llega con
        // `scopedAdministration`; el resto, con `scopedUserIds`, que calcula la capa web con la
        // cascada de mando. Sin ninguno de los dos, solo lo propio.
        const isGlobalViewer = actor.roles.includes(Role.MasterAdmin) || actor.isSystem;
        const administracion = isGlobalViewer ? undefined : input.scopedAdministration;
        const scopedUserIds = isGlobalViewer || administracion
          ? undefined
          : (input.scopedUserIds && input.scopedUserIds.length > 0
              ? input.scopedUserIds
              : [actor.actorId]
            ).map((id) => createEntityId(id));

        const entityId = createEntityId(input.contactId);
        const contact = await dependencies.contactsReader.getContactDetail(
          entityId,
          scopedUserIds,
          administracion ? { municipalityId: administracion.municipalityId, actorId: actor.actorId } : undefined
        );
        
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
