export { getContactTerritory, type GetContactTerritoryInput } from "./get-contact-territory.js";
export { linkContactToColony, type LinkContactToColonyInput } from "./link-contact-to-colony.js";
export { getSectionStats, type GetSectionStatsInput } from "./get-section-stats.js";
export type {
  AuditWriter,
  ContactTerritoryRepository,
  GetContactTerritoryDependencies,
  GetSectionStatsDependencies,
  IdGenerator,
  LinkContactToColonyDependencies,
  OutboxWriter,
  TerritoryCatalogReader,
  TransactionContext,
  TransactionManager,
  UseCaseResult
} from "./ports.js";
