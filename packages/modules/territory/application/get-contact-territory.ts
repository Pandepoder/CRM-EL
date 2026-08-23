import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { type TonalaOsError } from "@tonala/shared/errors";
import { createEntityId } from "@tonala/shared/kernel";
import { err, ok } from "@tonala/shared/kernel";
import { measureOperation } from "@tonala/shared/observability";

import { type ContactTerritorySummary } from "../contracts/index.js";
import { notFoundError } from "./errors.js";
import { type GetContactTerritoryDependencies, type UseCaseResult } from "./ports.js";

export type GetContactTerritoryInput = Readonly<{
  contactId: string;
}>;

export async function getContactTerritory(
  actor: ActorContext,
  input: GetContactTerritoryInput,
  dependencies: GetContactTerritoryDependencies
): UseCaseResult<ContactTerritorySummary> {
  return measureOperation({
    actor,
    logger: dependencies.logger,
    operation: "territory.getContactTerritory",
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
        const contactId = createEntityId(input.contactId);
        const territory = await dependencies.contactTerritoryRepository.findByContactId(contactId);
        if (!territory) {
          return err(notFoundError(
            "contact_territory_not_found",
            `Contact territory for contact ${input.contactId} was not found.`,
            "Contact territory was not found."
          ));
        }
        return ok(territory);
      } catch (error) {
        return err(error as TonalaOsError);
      }
    }
  });
}
