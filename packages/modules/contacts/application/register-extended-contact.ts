import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { type TonalaOsError, toSafeHttpError } from "@tonala/shared/errors";
import { err, ok } from "@tonala/shared/kernel";
import { LogLevel, measureOperation, type Logger } from "@tonala/shared/observability";

import { type ContactSummary } from "../contracts/index.js";
import { createMinimalContact } from "../domain/index.js";
import {
  type AuditWriter,
  type IdGenerator,
  type OutboxWriter,
  type TransactionContext,
  type TransactionManager,
  type UseCaseResult
} from "./ports.js";
import { type PermissionChecker } from "@tonala/shared/auth";

export type ExtendedContactInput = Readonly<{
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  maternalLastName?: string | null;
  referredByUserId?: string | null;
  birthDate?: Date | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  colony?: string | null;
  profession?: string | null;
  companyOrWork?: string | null;
  yearsKnown?: number | null;
  skill?: string | null;
  availability?: string | null;
  interests?: string | null;
  pastSupport?: string | null;
  municipality?: string | null;
  sectionId?: string | null;
}>;

export interface ExtendedContactRepository {
  insertExtended(
    contact: ReturnType<typeof createMinimalContact>,
    extended: ExtendedContactInput,
    tx: TransactionContext
  ): Promise<void>;
}

export type RegisterExtendedContactDependencies = Readonly<{
  extendedContactRepository: ExtendedContactRepository;
  transactionManager: TransactionManager;
  outboxWriter: OutboxWriter;
  auditWriter: AuditWriter;
  idGenerator: IdGenerator;
  clock: { now(): Date };
  permissionChecker: PermissionChecker;
  logger: Logger;
}>;

export async function registerExtendedContact(
  actor: ActorContext,
  input: ExtendedContactInput,
  dependencies: RegisterExtendedContactDependencies
): UseCaseResult<ContactSummary> {
  return measureOperation({
    actor,
    logger: dependencies.logger,
    operation: "contacts.registerExtendedContact",
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
          createdByUserId: actor.actorId,
          createdAt
        });
        const eventId = dependencies.idGenerator.newId();

        await dependencies.transactionManager.transaction(async (tx) => {
          await dependencies.extendedContactRepository.insertExtended(contact, input, tx);
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

        dependencies.logger.log(LogLevel.Info, "Extended contact registered", {
          actorId: actor.actorId,
          correlationId: actor.correlationId,
          entityId: contact.contactId,
          entityType: "contact",
          operation: "contacts.registerExtendedContact",
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
        dependencies.logger.log(LogLevel.Error, "Extended contact registration failed", {
          actorId: actor.actorId,
          correlationId: actor.correlationId,
          errorCode: safe.code,
          entityType: "contact",
          operation: "contacts.registerExtendedContact",
          success: false
        });
        return err(error as TonalaOsError);
      }
    }
  });
}
