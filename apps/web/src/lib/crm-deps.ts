/**
 * CRM dependency factory.
 *
 * Centraliza la creación de las dependencias de infraestructura para los
 * route handlers del CRM. Los routes solo importan desde /application
 * (que el tsconfig raíz resuelve correctamente), nunca de /infrastructure.
 */
import { type Database } from "@tonala/shared/database";
import { type ContactsReader } from "@tonala/modules/contacts/contracts";
import { type VisitsReader } from "@tonala/modules/visits/contracts";
import { type UsersReader } from "@tonala/modules/governance/contracts";

import { type TerritoryCatalogReader } from "@tonala/modules/territory/application";

export type CrmDependencies = Readonly<{
  contactsReader: ContactsReader;
  visitsReader: VisitsReader;
  usersReader: UsersReader;
  territoryCatalogReader: TerritoryCatalogReader;
}>;

export async function createCrmDependencies(db: Database): Promise<CrmDependencies> {
  // Importaciones dinámicas de infraestructura para evitar que ESLint
  // intente resolver los módulos en tiempo de lint (solo se resuelven en runtime).
  const { DrizzleContactsReader } = await import("@tonala/modules/contacts/infrastructure");
  const { DrizzleVisitRepository } = await import("@tonala/modules/visits/infrastructure");
  const { DrizzleUsersReader } = await import("@tonala/modules/governance/infrastructure");
  const { DrizzleTerritoryCatalogReader } = await import("@tonala/modules/territory/infrastructure");

  return {
    contactsReader: new DrizzleContactsReader(db),
    visitsReader: new DrizzleVisitRepository(db),
    usersReader: new DrizzleUsersReader(db),
    territoryCatalogReader: new DrizzleTerritoryCatalogReader(db)
  };
}

import { SystemClock } from "@tonala/shared/kernel";

export async function createExtendedContactsMutationsDependencies(db: Database) {
  const {
    CryptoIdGenerator,
    DrizzleAuditWriter,
    DrizzleExtendedContactRepository,
    DrizzleOutboxWriter,
    DrizzleTransactionManager
  } = await import("@tonala/modules/contacts/infrastructure");

  return {
    extendedContactRepository: new DrizzleExtendedContactRepository(),
    transactionManager: new DrizzleTransactionManager(db),
    outboxWriter: new DrizzleOutboxWriter(),
    auditWriter: new DrizzleAuditWriter(),
    clock: new SystemClock(),
    idGenerator: new CryptoIdGenerator()
  };
}

export async function createContactsMutationsDependencies(db: Database) {
  const {
    CryptoIdGenerator,
    DrizzleAuditWriter,
    DrizzleContactRepository,
    DrizzleOutboxWriter,
    DrizzleTransactionManager
  } = await import("@tonala/modules/contacts/infrastructure");

  return {
    contactRepository: new DrizzleContactRepository(db),
    transactionManager: new DrizzleTransactionManager(db),
    outboxWriter: new DrizzleOutboxWriter(),
    auditWriter: new DrizzleAuditWriter(),
    clock: new SystemClock(),
    idGenerator: new CryptoIdGenerator()
  };
}

export async function createTerritoryMutationsDependencies(db: Database) {
  const {
    CryptoIdGenerator,
    DrizzleAuditWriter,
    DrizzleContactTerritoryRepository,
    DrizzleOutboxWriter,
    DrizzleTerritoryCatalogReader,
    DrizzleTerritoryReader,
    DrizzleTransactionManager
  } = await import("@tonala/modules/territory/infrastructure");
  const { DrizzleContactsReader } = await import("@tonala/modules/contacts/infrastructure");

  return {
    contactsReader: new DrizzleContactsReader(db),
    territoryCatalogReader: new DrizzleTerritoryCatalogReader(db),
    territoryReader: new DrizzleTerritoryReader(db),
    contactTerritoryRepository: new DrizzleContactTerritoryRepository(db),
    transactionManager: new DrizzleTransactionManager(db),
    outboxWriter: new DrizzleOutboxWriter(),
    auditWriter: new DrizzleAuditWriter(),
    clock: new SystemClock(),
    idGenerator: new CryptoIdGenerator()
  };
}

export async function createAssignmentsMutationsDependencies(db: Database) {
  const {
    CryptoIdGenerator,
    DrizzleAuditWriter,
    DrizzleContactAssignmentRepository,
    DrizzleOutboxWriter,
    DrizzleTransactionManager,
    DrizzleUserDirectoryReader
  } = await import("@tonala/modules/assignments/infrastructure");
  const { DrizzleContactsReader } = await import("@tonala/modules/contacts/infrastructure");
  const { DrizzleTerritoryReader } = await import("@tonala/modules/territory/infrastructure");

  return {
    contactsReader: new DrizzleContactsReader(db),
    territoryReader: new DrizzleTerritoryReader(db),
    userDirectoryReader: new DrizzleUserDirectoryReader(db),
    contactAssignmentRepository: new DrizzleContactAssignmentRepository(db),
    transactionManager: new DrizzleTransactionManager(db),
    outboxWriter: new DrizzleOutboxWriter(),
    auditWriter: new DrizzleAuditWriter(),
    clock: new SystemClock(),
    idGenerator: new CryptoIdGenerator()
  };
}

export async function createVisitsMutationsDependencies(db: Database) {
  const {
    CryptoIdGenerator,
    DrizzleAuditWriter,
    DrizzleOutboxWriter,
    DrizzleTransactionManager,
    DrizzleVisitRepository,
    DrizzleVisitResultRepository
  } = await import("@tonala/modules/visits/infrastructure");
  const { DrizzleContactsReader } = await import("@tonala/modules/contacts/infrastructure");
  const { DrizzleTerritoryReader } = await import("@tonala/modules/territory/infrastructure");
  const { DrizzleContactAssignmentRepository } = await import("@tonala/modules/assignments/infrastructure");

  return {
    contactsReader: new DrizzleContactsReader(db),
    territoryReader: new DrizzleTerritoryReader(db),
    assignmentsReader: new DrizzleContactAssignmentRepository(db),
    visitRepository: new DrizzleVisitRepository(db),
    visitResultRepository: new DrizzleVisitResultRepository(),
    transactionManager: new DrizzleTransactionManager(db),
    outboxWriter: new DrizzleOutboxWriter(),
    auditWriter: new DrizzleAuditWriter(),
    clock: new SystemClock(),
    idGenerator: new CryptoIdGenerator()
  };
}
