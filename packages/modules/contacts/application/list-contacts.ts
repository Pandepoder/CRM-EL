import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { type TonalaOsError } from "@tonala/shared/errors";
import { createEntityId, err, ok } from "@tonala/shared/kernel";
import { measureOperation } from "@tonala/shared/observability";

import { type ContactListItem } from "../contracts/index.js";
import { type ListContactsDependencies, type UseCaseResult } from "./ports.js";

export type ListContactsInput = Readonly<{
  assignedUserId?: string;
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
        // Users who are not admin or direction can only view their own registered/assigned contacts
        const isGlobalViewer = actor.roles.includes("admin") || actor.roles.includes("direction") || actor.isSystem;
        const scopedUserId = !isGlobalViewer ? actor.actorId : undefined;

        const result = await dependencies.contactsReader.listContacts({
          ...(scopedUserId !== undefined ? { scopedUserId } : {}),
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

