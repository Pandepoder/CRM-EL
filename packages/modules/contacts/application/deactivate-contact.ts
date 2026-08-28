import { type ActorContext, type PermissionChecker, Permission } from "@tonala/shared/auth";
import { type TonalaOsError } from "@tonala/shared/errors";
import { createEntityId, ok, err } from "@tonala/shared/kernel";
import { type Logger } from "@tonala/shared/observability";

import { type UseCaseResult } from "./ports.js";
import { type TransactionManager, type ContactRepository, type AuditWriter } from "./ports.js";

export type DeactivateContactInput = {
  contactId: string;
};

export type DeactivateContactDependencies = {
  txManager: TransactionManager;
  contactRepository: ContactRepository;
  auditWriter: AuditWriter;
  logger: Logger;
  permissionChecker: PermissionChecker;
};

export async function deactivateContact(
  actor: ActorContext,
  input: DeactivateContactInput,
  deps: DeactivateContactDependencies
): UseCaseResult<void> {
  const decision = deps.permissionChecker.can(actor, Permission.ContactsCreate); // Assuming ContactsWrite is part of ContactsCreate or ContactsRead for now. Let's use ContactsCreate. Wait, there is no ContactsWrite in Permission enum. I'll use ContactsCreate for now since it represents modifying contacts.
  if (!decision.allowed) {
    return err({ code: "UNAUTHORIZED", message: "No permission" } as unknown as TonalaOsError);
  }

  const cid = createEntityId(input.contactId);

  return deps.txManager.transaction(async (_tx) => {
    const contact = await deps.contactRepository.findById(cid);
    if (!contact) {
      return err({ code: "NOT_FOUND", message: "Contact not found" } as unknown as TonalaOsError);
    }

    if (contact.status === "inactive") {
      return ok(undefined);
    }

    return err({ code: "NOT_IMPLEMENTED", message: "Not implemented" } as unknown as TonalaOsError);
  });
}
