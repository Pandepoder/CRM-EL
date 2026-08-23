import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { type TonalaOsError } from "@tonala/shared/errors";
import { err, ok } from "@tonala/shared/kernel";
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
        const result = await dependencies.contactsReader.listContacts({
          ...(input.assignedUserId !== undefined ? { assignedUserId: input.assignedUserId as any } : {}),
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

