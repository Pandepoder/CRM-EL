import { Permission, Role, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { type TonalaOsError } from "@tonala/shared/errors";
import { createEntityId, err, ok } from "@tonala/shared/kernel";
import { measureOperation } from "@tonala/shared/observability";

import { type ContactListItem } from "../contracts/index.js";
import { type ListContactsDependencies, type UseCaseResult } from "./ports.js";

export type ListContactsInput = Readonly<{
  assignedUserId?: string;
  /**
   * Usuarios cuyo trabajo puede ver quien consulta. Lo calcula la capa web, que
   * es la que conoce la jerarquía de equipos; sin él se cae a "solo lo propio".
   */
  scopedUserIds?: readonly string[];
  scopedContactIds?: readonly string[];
  /** Un administrador municipal: su municipio (o `null` si sigue sin uno). Ver `ScopedAdministration`. */
  scopedAdministration?: Readonly<{ municipalityId: string | null }>;
  q?: string;
  page?: number;
  pageSize?: number;
}>;

export async function listContacts(
  actor: ActorContext,
  input: ListContactsInput,
  dependencies: ListContactsDependencies
): UseCaseResult<{ items: ContactListItem[]; total: number }> {
  return measureOperation({
    actor,
    logger: dependencies.logger,
    operation: "contacts.listContacts",
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

        const result = await dependencies.contactsReader.listContacts({
          ...(input.scopedContactIds !== undefined ? { scopedContactIds: input.scopedContactIds.map(createEntityId) } : {}),
          ...(scopedUserIds !== undefined ? { scopedUserIds } : {}),
          ...(administracion ? { scopedAdministration: { municipalityId: administracion.municipalityId, actorId: actor.actorId } } : {}),
          ...(input.assignedUserId !== undefined ? { assignedUserId: createEntityId(input.assignedUserId) } : {}),
          ...(input.q !== undefined ? { q: input.q } : {}),
          ...(input.page !== undefined ? { page: input.page } : {}),
          ...(input.pageSize !== undefined ? { pageSize: input.pageSize } : {})
        });
        return ok(result);
      } catch (error) {
        return err(error as TonalaOsError);
      }
    }
  });
}

