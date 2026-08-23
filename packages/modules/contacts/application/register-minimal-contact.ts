import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { type TonalaOsError, toSafeHttpError } from "@tonala/shared/errors";
import { createMinimalContact } from "../domain/index.js";
import { err, ok } from "@tonala/shared/kernel";
import { LogLevel, measureOperation } from "@tonala/shared/observability";

import { type ContactSummary } from "../contracts/index.js";
import { type RegisterMinimalContactDependencies, type UseCaseResult } from "./ports.js";

export type RegisterMinimalContactInput = Readonly<{
  displayName: string;
  phoneNumber?: string | undefined;
}>;

export async function registerMinimalContact(
  actor: ActorContext,
  input: RegisterMinimalContactInput,
  dependencies: RegisterMinimalContactDependencies
): UseCaseResult<ContactSummary> {
  return measureOperation({
    actor,
    logger: dependencies.logger,
    operation: "contacts.registerMinimalContact",
    run: async () => {
      const authorization = requirePermission(
        actor,
        Permission.ContactsCreate,
        dependencies.permissionChecker
      );
      if (!authorization.ok) {
        return err(authorization.error);
      }

      try {
        const createdAt = dependencies.clock.now();
        const contact = createMinimalContact({
          contactId: dependencies.idGenerator.newId(),
          displayName: input.displayName,
          ...(input.phoneNumber !== undefined ? { phoneNumber: input.phoneNumber } : {}),
          createdByUserId: actor.actorId,
          createdAt
        });
        const eventId = dependencies.idGenerator.newId();

        await dependencies.transactionManager.transaction(async (tx) => {
          await dependencies.contactRepository.insert(contact, tx);
          await dependencies.auditWriter.write({
            actor,
            action: "contacts.register",
            entityType: "contact",
            entityId: contact.contactId,
            beforeData: null,
            afterData: {
              contactId: contact.contactId,
              status: contact.status,
              version: contact.version
            }
          }, tx);
          await dependencies.outboxWriter.writeContactRegistered({
            eventId,
            contact,
            actor,
            occurredAt: createdAt
          }, tx);
        });

        dependencies.logger.log(LogLevel.Info, "Contact registered", {
          actorId: actor.actorId,
          correlationId: actor.correlationId,
          entityId: contact.contactId,
          entityType: "contact",
          operation: "contacts.registerMinimalContact",
          success: true
        });

        return ok({
          contactId: contact.contactId,
          displayName: contact.displayName,
          status: contact.status,
          createdAt: contact.createdAt.toISOString(),
          version: contact.version
        });
      } catch (error) {
        const safe = toSafeHttpError(error);
        dependencies.logger.log(LogLevel.Error, "Contact registration failed", {
          actorId: actor.actorId,
          correlationId: actor.correlationId,
          errorCode: safe.code,
          entityType: "contact",
          operation: "contacts.registerMinimalContact",
          success: false
        });
        return err(error as TonalaOsError);
      }
    }
  });
}

