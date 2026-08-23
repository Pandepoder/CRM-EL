import { type CorrelationId, type EntityId } from "@tonala/shared/kernel";

export type ColonyId = EntityId;
export type TerritoryStatusView = "confirmed" | "pending";

export type ContactTerritorySummary = Readonly<{
  contactId: EntityId;
  colonyId: ColonyId;
  colonyName?: string;
  territoryStatus: TerritoryStatusView;
  linkedAt: string;
  version: number;
}>;

export type TerritoryListItem = Readonly<{
  colonyId: EntityId;
  name: string;
  assignedUsersCount: number;
  contactsCount: number;
}>;

export type SectionStatsDto = Readonly<{
  sectionNum: number;
  contactCount: number;
  visitScheduledCount: number;
  visitCompletedCount: number;
  colonies: string[];
}>;

export type LinkContactToColonyResult = Readonly<{
  contactTerritory: ContactTerritorySummary;
  changed: boolean;
  idempotent: boolean;
}>;

export type ContactLinkedToColonyV1Payload = Readonly<{
  contact_id: string;
  colony_id: string;
  territory_status: "confirmed";
  linked_at: string;
}>;

export type ContactLinkedToColonyV1Metadata = Readonly<{
  event_id: string;
  event_name: "ContactLinkedToColony.v1";
  event_version: 1;
  occurred_at: string;
  correlation_id: CorrelationId;
  actor_id: string;
  aggregate_type: "contact_territory";
  aggregate_id: string;
}>;

export type ContactLinkedToColonyV1 = Readonly<{
  name: "ContactLinkedToColony.v1";
  version: 1;
  payload: ContactLinkedToColonyV1Payload;
  metadata: ContactLinkedToColonyV1Metadata;
}>;

export interface TerritoryReader {
  getContactTerritory(contactId: EntityId): Promise<ContactTerritorySummary | null>;
  listActiveColonies(): Promise<TerritoryListItem[]>;
  getSectionStats(sectionNum: number): Promise<SectionStatsDto | null>;
}
