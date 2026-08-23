import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { type TonalaOsError, toSafeHttpError } from "@tonala/shared/errors";
import { createEntityId } from "@tonala/shared/kernel";
import { err, ok } from "@tonala/shared/kernel";
import { LogLevel, measureOperation } from "@tonala/shared/observability";

import { type LinkContactToColonyResult } from "../contracts/index.js";
import { createInitialContactTerritory, relinkContactTerritory } from "../domain/index.js";
import { conflictError, notFoundError } from "./errors.js";
import { type LinkContactToColonyDependencies, type UseCaseResult } from "./ports.js";

export type LinkContactToColonyInput = Readonly<{
  contactId: string;
  colonyId: string;
}>;

export async function linkContactToColony(
  actor: ActorContext,
  input: LinkContactToColonyInput,
  dependencies: LinkContactToColonyDependencies
): UseCaseResult<LinkContactToColonyResult> {
  return measureOperation({
    actor,
    logger: dependencies.logger,
    operation: "territory.linkContactToColony",
    run: async () => {
      const authorization = requirePermission(
        actor,
        Permission.TerritoryLink,
        dependencies.permissionChecker
      );
      if (!authorization.ok) {
        return err(authorization.error);
      }

      try {
        const contactId = createEntityId(input.contactId);
        const colonyId = createEntityId(input.colonyId);
        const contact = await dependencies.contactsReader.getContactStatus(contactId);
        if (!contact || contact.status !== "active") {
          return err(notFoundError(
            "contact_not_found",
            `Contact ${input.contactId} was not found or is inactive.`,
            "Contact was not found."
          ));
        }

        const colony = await dependencies.territoryCatalogReader.findActiveColonyById(colonyId);
        if (!colony) {
          return err(notFoundError(
            "colony_not_found",
            `Colony ${input.colonyId} was not found or is inactive.`,
            "Colony was not found."
          ));
        }

        const linkedAt = dependencies.clock.now();
        const eventId = dependencies.idGenerator.newId();
        const outcome = await dependencies.transactionManager.transaction(async (tx) => {
          const current = await dependencies.contactTerritoryRepository.findByContactId(contactId, tx);
          if (current?.colonyId === colonyId) {
            return {
              contactTerritory: current,
              changed: false,
              idempotent: true
            } satisfies LinkContactToColonyResult;
          }

          const next = current
            ? relinkContactTerritory({
              contactId,
              colonyId: current.colonyId,
              territoryStatus: "confirmed",
              linkedByUserId: actor.actorId,
              linkedAt: new Date(current.linkedAt),
              version: current.version
            }, {
              colonyId,
              linkedByUserId: actor.actorId,
              linkedAt
            })
            : createInitialContactTerritory({
              contactId,
              colonyId,
              linkedByUserId: actor.actorId,
              linkedAt
            });

          if (current) {
            const updated = await dependencies.contactTerritoryRepository.updateExisting({
              previousVersion: current.version,
              next
            }, tx);
            if (!updated) {
              throw conflictError(
                "contact_territory_version_conflict",
                `Contact territory ${contactId} was changed concurrently.`,
                "Territory was changed by another operation. Please retry."
              );
            }
          } else {
            await dependencies.contactTerritoryRepository.upsertInitial(next, tx);
          }

          await dependencies.auditWriter.write({
            actor,
            action: "territory.contact_linked",
            entityType: "contact_territory",
            entityId: contactId,
            beforeData: current
              ? {
                previous_colony_id: current.colonyId,
                previous_status: current.territoryStatus,
                previous_version: current.version
              }
              : null,
            afterData: {
              colony_id: next.colonyId,
              territory_status: next.territoryStatus,
              version: next.version
            }
          }, tx);

          await dependencies.outboxWriter.writeContactLinkedToColony({
            eventId,
            contactTerritory: next,
            actor,
            occurredAt: linkedAt
          }, tx);

          return {
            contactTerritory: {
              contactId: next.contactId,
              colonyId: next.colonyId,
              colonyName: colony.name,
              territoryStatus: next.territoryStatus,
              linkedAt: next.linkedAt.toISOString(),
              version: next.version
            },
            changed: true,
            idempotent: false
          } satisfies LinkContactToColonyResult;
        });

        dependencies.logger.log(LogLevel.Info, "Contact linked to colony", {
          actorId: actor.actorId,
          correlationId: actor.correlationId,
          entityId: contactId,
          entityType: "contact_territory",
          details: { colonyId, contactId },
          operation: "territory.linkContactToColony",
          success: true
        });

        return ok(outcome);
      } catch (error) {
        const safe = toSafeHttpError(error);
        dependencies.logger.log(LogLevel.Error, "Contact territory link failed", {
          actorId: actor.actorId,
          correlationId: actor.correlationId,
          errorCode: safe.code,
          entityType: "contact_territory",
          operation: "territory.linkContactToColony",
          success: false
        });
        return err(error as TonalaOsError);
      }
    }
  });
}
