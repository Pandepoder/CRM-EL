import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
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
        // Solo administración ve todo. Dirección dejó de ser global: ve los
        // equipos que le asignaron, y ese conjunto llega en `scopedUserIds`.
        const isGlobalViewer = actor.roles.includes("admin") || actor.isSystem;
        const scopedUserIds = isGlobalViewer
          ? undefined
          : (input.scopedUserIds && input.scopedUserIds.length > 0
              ? input.scopedUserIds
              : [actor.actorId]
            ).map((id) => createEntityId(id));

        const result = await dependencies.contactsReader.listContacts({
          ...(scopedUserIds !== undefined ? { scopedUserIds } : {}),
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

