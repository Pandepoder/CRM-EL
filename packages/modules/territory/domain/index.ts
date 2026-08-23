import { DomainError } from "@tonala/shared/errors";
import { type EntityId } from "@tonala/shared/kernel";

export const TerritoryStatus = {
  Confirmed: "confirmed"
} as const;

export type TerritoryStatus = (typeof TerritoryStatus)[keyof typeof TerritoryStatus];

export type ContactTerritory = Readonly<{
  contactId: EntityId;
  colonyId: EntityId;
  territoryStatus: TerritoryStatus;
  linkedByUserId: EntityId;
  linkedAt: Date;
  version: number;
}>;

export function createInitialContactTerritory(input: {
  readonly contactId: EntityId;
  readonly colonyId: EntityId;
  readonly linkedByUserId: EntityId;
  readonly linkedAt: Date;
}): ContactTerritory {
  return {
    contactId: input.contactId,
    colonyId: input.colonyId,
    territoryStatus: TerritoryStatus.Confirmed,
    linkedByUserId: input.linkedByUserId,
    linkedAt: input.linkedAt,
    version: 1
  };
}

export function relinkContactTerritory(
  current: ContactTerritory,
  input: {
    readonly colonyId: EntityId;
    readonly linkedByUserId: EntityId;
    readonly linkedAt: Date;
  }
): ContactTerritory {
  if (current.version < 1) {
    throw new DomainError({
      code: "invalid_contact_territory_version",
      message: "Contact territory version must be greater than or equal to 1.",
      publicMessage: "Territory state is invalid."
    });
  }

  return {
    contactId: current.contactId,
    colonyId: input.colonyId,
    territoryStatus: TerritoryStatus.Confirmed,
    linkedByUserId: input.linkedByUserId,
    linkedAt: input.linkedAt,
    version: current.version + 1
  };
}
