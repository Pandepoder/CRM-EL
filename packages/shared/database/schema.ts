import {
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";
import { encryptData, decryptData } from "./crypto.js";

export const encryptedText = customType<{ data: string; driverData: string }>({
  dataType() {
    return "text";
  },
  toDriver(value) {
    if (value == null) return null as any;
    return encryptData(value) as any;
  },
  fromDriver(value) {
    if (value == null) return null as any;
    return decryptData(value) as any;
  }
});

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex("roles_key_unique").on(table.key)]
);

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: text("auth_user_id"),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash"),
    roleId: uuid("role_id").notNull().references(() => roles.id),
    status: text("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("user_profiles_email_unique").on(table.email),
    uniqueIndex("user_profiles_auth_user_id_unique").on(table.authUserId)
  ]
);

export const catalogVersions = pgTable(
  "catalog_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    catalogType: text("catalog_type").notNull(),
    sourceName: text("source_name").notNull(),
    sourceVersion: text("source_version").notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("catalog_versions_source_unique").on(
      table.catalogType,
      table.sourceName,
      table.sourceVersion
    )
  ]
);

export const colonies = pgTable(
  "colonies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    catalogVersionId: uuid("catalog_version_id").notNull().references(() => catalogVersions.id),
    name: text("name").notNull(),
    postalCode: text("postal_code"),
    municipality: text("municipality"),
    status: text("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex("colonies_catalog_name_unique").on(table.catalogVersionId, table.name)]
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey(),
    displayName: text("display_name").notNull(),
    status: text("status").notNull().default("active"),
    createdByUserId: uuid("created_by_user_id").notNull().references(() => userProfiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    version: integer("version").notNull().default(1),

    // CRM Extended Fields
    referredByUserId: uuid("referred_by_user_id").references(() => userProfiles.id),
    sectionId: uuid("section_id").references(() => electoralSections.id),
    firstName: encryptedText("first_name"),
    lastName: encryptedText("last_name"),
    maternalLastName: encryptedText("maternal_last_name"),
    birthDate: timestamp("birth_date", { withTimezone: true }),
    phone: encryptedText("phone"),
    email: encryptedText("email"),
    address: encryptedText("address"),
    addressNumber: encryptedText("address_number"),
    colony: encryptedText("colony"),
    municipality: encryptedText("municipality"),
    profession: encryptedText("profession"),
    companyOrWork: encryptedText("company_or_work"),
    yearsKnown: integer("years_known"),
    skill: encryptedText("skill"),
    availability: encryptedText("availability"),
    interests: encryptedText("interests"),
    pastSupport: encryptedText("past_support")
  },
  (table) => [
    check("contacts_status_check", sql`${table.status} IN ('active', 'inactive')`),
    check("contacts_version_check", sql`${table.version} >= 1`)
  ]
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id").notNull().references(() => userProfiles.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  correlationId: text("correlation_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const electoralSections = pgTable("electoral_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  sectionNum: integer("section_num").notNull().unique(),
  geomJson: jsonb("geom_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const sectionColonies = pgTable(
  "section_colonies",
  {
    sectionId: uuid("section_id")
      .notNull()
      .references(() => electoralSections.id),
    colonyId: uuid("colony_id")
      .notNull()
      .references(() => colonies.id)
  },
  (table) => ({
    pk: primaryKey({ columns: [table.sectionId, table.colonyId] })
  })
);

export const transactionalOutbox = pgTable(
  "transactional_outbox",
  {
    eventId: uuid("event_id").primaryKey(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    eventName: text("event_name").notNull(),
    eventVersion: integer("event_version").notNull(),
    payload: jsonb("payload").notNull(),
    metadata: jsonb("metadata").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastError: text("last_error"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by")
  },
  (table) => [
    check(
      "transactional_outbox_status_check",
      sql`${table.status} IN ('pending', 'processing', 'processed', 'dead_letter')`
    ),
    check("transactional_outbox_attempts_check", sql`${table.attempts} >= 0`)
  ]
);

export const outboxConsumerReceipts = pgTable(
  "outbox_consumer_receipts",
  {
    eventId: uuid("event_id").notNull().references(() => transactionalOutbox.eventId),
    consumerName: text("consumer_name").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull(),
    resultMetadata: jsonb("result_metadata")
  },
  (table) => [
    uniqueIndex("outbox_consumer_receipts_pk").on(table.eventId, table.consumerName),
    check("outbox_consumer_receipts_consumer_name_check", sql`length(trim(${table.consumerName})) > 0`)
  ]
);

export const processedEventLog = pgTable(
  "processed_event_log",
  {
    eventId: uuid("event_id").notNull().references(() => transactionalOutbox.eventId),
    consumerName: text("consumer_name").notNull(),
    eventName: text("event_name").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull()
  },
  (table) => [
    uniqueIndex("processed_event_log_pk").on(table.eventId, table.consumerName),
    check("processed_event_log_consumer_name_check", sql`length(trim(${table.consumerName})) > 0`)
  ]
);

export const projectionStates = pgTable(
  "projection_states",
  {
    projectionName: text("projection_name").notNull(),
    projectionVersion: text("projection_version").notNull(),
    status: text("status").notNull().default("active"),
    lastProcessedEventId: text("last_processed_event_id"),
    lastProcessedEventCreatedAt: timestamp("last_processed_event_created_at", { withTimezone: true }),
    lastProcessedAt: timestamp("last_processed_at", { withTimezone: true }),
    rebuildStartedAt: timestamp("rebuild_started_at", { withTimezone: true }),
    rebuildCompletedAt: timestamp("rebuild_completed_at", { withTimezone: true }),
    failureCount: integer("failure_count").notNull().default(0),
    lastError: text("last_error"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    primaryKey({ columns: [table.projectionName, table.projectionVersion], name: "projection_states_pk" }),
    index("projection_states_status_idx").on(table.status),
    check("projection_states_name_check", sql`length(trim(${table.projectionName})) > 0`),
    check("projection_states_version_text_check", sql`length(trim(${table.projectionVersion})) > 0`),
    check(
      "projection_states_status_check",
      sql`${table.status} IN ('active', 'rebuilding', 'paused', 'failed', 'deprecated')`
    ),
    check("projection_states_failure_count_check", sql`${table.failureCount} >= 0`),
    check("projection_states_version_check", sql`${table.version} >= 1`),
    check(
      "projection_states_checkpoint_pair_check",
      sql`(
        (${table.lastProcessedEventId} IS NULL AND ${table.lastProcessedEventCreatedAt} IS NULL)
        OR
        (${table.lastProcessedEventId} IS NOT NULL AND ${table.lastProcessedEventCreatedAt} IS NOT NULL)
      )`
    )
  ]
);

export const projectionEventReceipts = pgTable(
  "projection_event_receipts",
  {
    projectionName: text("projection_name").notNull(),
    projectionVersion: text("projection_version").notNull(),
    eventId: text("event_id").notNull(),
    eventName: text("event_name").notNull(),
    eventVersion: text("event_version").notNull(),
    eventCreatedAt: timestamp("event_created_at", { withTimezone: true }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull()
  },
  (table) => [
    primaryKey({
      columns: [table.projectionName, table.projectionVersion, table.eventId],
      name: "projection_event_receipts_pk"
    }),
    index("projection_event_receipts_projection_idx").on(table.projectionName, table.projectionVersion),
    index("projection_event_receipts_event_created_at_idx").on(table.eventCreatedAt),
    check("projection_event_receipts_name_check", sql`length(trim(${table.projectionName})) > 0`),
    check("projection_event_receipts_version_check", sql`length(trim(${table.projectionVersion})) > 0`),
    check("projection_event_receipts_event_id_check", sql`length(trim(${table.eventId})) > 0`),
    check("projection_event_receipts_event_name_check", sql`length(trim(${table.eventName})) > 0`),
    check("projection_event_receipts_event_version_check", sql`length(trim(${table.eventVersion})) > 0`)
  ]
);

export const projectionRebuildReceipts = pgTable(
  "projection_rebuild_receipts",
  {
    rebuildId: text("rebuild_id").notNull(),
    projectionName: text("projection_name").notNull(),
    projectionVersion: text("projection_version").notNull(),
    eventId: text("event_id").notNull(),
    eventName: text("event_name").notNull(),
    eventVersion: text("event_version").notNull(),
    eventCreatedAt: timestamp("event_created_at", { withTimezone: true }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull()
  },
  (table) => [
    primaryKey({
      columns: [table.rebuildId, table.projectionName, table.projectionVersion, table.eventId],
      name: "projection_rebuild_receipts_pk"
    }),
    index("projection_rebuild_receipts_rebuild_idx").on(table.rebuildId),
    index("projection_rebuild_receipts_projection_idx").on(table.projectionName, table.projectionVersion),
    index("projection_rebuild_receipts_event_created_at_idx").on(table.eventCreatedAt),
    check("projection_rebuild_receipts_rebuild_id_check", sql`length(trim(${table.rebuildId})) > 0`),
    check("projection_rebuild_receipts_name_check", sql`length(trim(${table.projectionName})) > 0`),
    check("projection_rebuild_receipts_version_check", sql`length(trim(${table.projectionVersion})) > 0`),
    check("projection_rebuild_receipts_event_id_check", sql`length(trim(${table.eventId})) > 0`),
    check("projection_rebuild_receipts_event_name_check", sql`length(trim(${table.eventName})) > 0`),
    check("projection_rebuild_receipts_event_version_check", sql`length(trim(${table.eventVersion})) > 0`)
  ]
);

export const walkingSkeletonProjectionV1 = pgTable(
  "walking_skeleton_projection_v1",
  {
    projectionKey: text("projection_key").primaryKey(),
    contactRegisteredCount: integer("contact_registered_count").notNull().default(0),
    contactLinkedCount: integer("contact_linked_count").notNull().default(0),
    responsibleAssignedCount: integer("responsible_assigned_count").notNull().default(0),
    visitScheduledCount: integer("visit_scheduled_count").notNull().default(0),
    visitCompletedCount: integer("visit_completed_count").notNull().default(0),
    lastEventAt: timestamp("last_event_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check("walking_skeleton_projection_key_check", sql`length(trim(${table.projectionKey})) > 0`),
    check("walking_skeleton_projection_single_row_check", sql`${table.projectionKey} = 'global'`),
    check("walking_skeleton_projection_contact_registered_count_check", sql`${table.contactRegisteredCount} >= 0`),
    check("walking_skeleton_projection_contact_linked_count_check", sql`${table.contactLinkedCount} >= 0`),
    check("walking_skeleton_projection_responsible_assigned_count_check", sql`${table.responsibleAssignedCount} >= 0`),
    check("walking_skeleton_projection_visit_scheduled_count_check", sql`${table.visitScheduledCount} >= 0`),
    check("walking_skeleton_projection_visit_completed_count_check", sql`${table.visitCompletedCount} >= 0`),
    check("walking_skeleton_projection_version_check", sql`${table.version} >= 1`)
  ]
);

export const contactTerritory = pgTable(
  "contact_territory",
  {
    contactId: uuid("contact_id").primaryKey().references(() => contacts.id),
    colonyId: uuid("colony_id").notNull().references(() => colonies.id),
    territoryStatus: text("territory_status").notNull(),
    linkedByUserId: uuid("linked_by_user_id").notNull().references(() => userProfiles.id),
    linkedAt: timestamp("linked_at", { withTimezone: true }).notNull(),
    version: integer("version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check("contact_territory_status_check", sql`${table.territoryStatus} IN ('confirmed')`),
    check("contact_territory_version_check", sql`${table.version} >= 1`)
  ]
);

export const contactAssignments = pgTable(
  "contact_assignments",
  {
    contactId: uuid("contact_id").primaryKey().references(() => contacts.id),
    assignedUserId: uuid("assigned_user_id").notNull().references(() => userProfiles.id),
    assignmentStatus: text("assignment_status").notNull(),
    assignedByUserId: uuid("assigned_by_user_id").notNull().references(() => userProfiles.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull(),
    version: integer("version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check("contact_assignments_status_check", sql`${table.assignmentStatus} IN ('active', 'pending')`),
    check("contact_assignments_version_check", sql`${table.version} >= 1`)
  ]
);

export const visits = pgTable(
  "visits",
  {
    id: uuid("id").primaryKey(),
    contactId: uuid("contact_id").notNull().references(() => contacts.id),
    colonyId: uuid("colony_id").notNull().references(() => colonies.id),
    assignedUserId: uuid("assigned_user_id").notNull().references(() => userProfiles.id),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    status: text("status").notNull(),
    visitLocationText: text("visit_location_text").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull().references(() => userProfiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedByUserId: uuid("completed_by_user_id").references(() => userProfiles.id),
    version: integer("version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check("visits_status_check", sql`${table.status} IN ('scheduled', 'completed')`),
    check("visits_version_check", sql`${table.version} >= 1`),
    check("visits_location_text_check", sql`length(trim(${table.visitLocationText})) > 0`),
    check(
      "visits_completion_state_check",
      sql`(
        (${table.status} = 'scheduled' AND ${table.completedAt} IS NULL AND ${table.completedByUserId} IS NULL)
        OR
        (${table.status} = 'completed' AND ${table.completedAt} IS NOT NULL AND ${table.completedByUserId} IS NOT NULL)
      )`
    )
  ]
);

export const visitResults = pgTable(
  "visit_results",
  {
    visitId: uuid("visit_id").primaryKey().references(() => visits.id),
    structuredOutcome: text("structured_outcome").notNull(),
    summary: text("summary").notNull(),
    completedByUserId: uuid("completed_by_user_id").notNull().references(() => userProfiles.id),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull()
  },
  (table) => [
    check(
      "visit_results_outcome_check",
      sql`${table.structuredOutcome} IN ('successful', 'no_contact', 'follow_up_required', 'rejected')`
    ),
    check("visit_results_summary_check", sql`length(trim(${table.summary})) > 0`)
  ]
);

export const eventReports = pgTable(
  "event_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    category: text("category").notNull(),
    municipality: text("municipality"),
    district: text("district"),
    sectionId: uuid("section_id").references(() => electoralSections.id),
    assignedToUserId: uuid("assigned_to_user_id").references(() => userProfiles.id),
    eventDate: timestamp("event_date", { withTimezone: true }),
    status: text("status").notNull().default("active"),
    createdByUserId: uuid("created_by_user_id").notNull().references(() => userProfiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    check("event_reports_category_check", sql`${table.category} IN ('emergencia', 'incidencia', 'mitin', 'propaganda', 'servicios', 'sospechoso', 'brigada', 'bache', 'alumbrado', 'fuga_agua', 'inundacion', 'basura', 'seguridad', 'lona_danada')`)
  ]
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    leaderId: uuid("leader_id").notNull().references(() => userProfiles.id),
    zone: text("zone"),
    municipality: text("municipality"),
    section: text("section"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  }
);

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: uuid("team_id").notNull().references(() => teams.id),
    userId: uuid("user_id").notNull().references(() => userProfiles.id),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.userId], name: "team_members_pk" })
  ]
);

export const electoralRepresentatives = pgTable(
  "electoral_representatives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sectionId: uuid("section_id").notNull().references(() => electoralSections.id),
    userId: uuid("user_id").notNull().references(() => userProfiles.id),
    role: text("role").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("electoral_reps_section_user_idx").on(table.sectionId, table.userId)
  ]
);

// ==========================================
// LOGISTICS & INVENTORY MODULE
// ==========================================

export const warehouses = pgTable("warehouses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  location: text("location"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  warehouseId: uuid("warehouse_id").notNull().references(() => warehouses.id),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  quantity: integer("quantity").notNull().default(0),
  category: text("category").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id").notNull().references(() => inventoryItems.id),
  transactionType: text("transaction_type").notNull(), // 'in', 'out'
  quantity: integer("quantity").notNull(),
  assignedToUserId: uuid("assigned_to_user_id").references(() => userProfiles.id),
  performedByUserId: uuid("performed_by_user_id").notNull().references(() => userProfiles.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// INBOX & MESSAGING MODULE
// ==========================================

export const inboxConversations = pgTable("inbox_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").references(() => contacts.id),
  channel: text("channel").notNull(), // 'whatsapp', 'sms', 'messenger'
  externalId: text("external_id").notNull().unique(), // The phone number or Facebook ID
  status: text("status").notNull().default("open"), // 'open', 'resolved', 'ignored'
  assignedToUserId: uuid("assigned_to_user_id").references(() => userProfiles.id),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inboxMessages = pgTable("inbox_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => inboxConversations.id),
  direction: text("direction").notNull(), // 'inbound', 'outbound'
  content: text("content").notNull(),
  status: text("status").notNull().default("sent"), // 'sent', 'delivered', 'read', 'failed'
  sentByUserId: uuid("sent_by_user_id").references(() => userProfiles.id), // null if inbound
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
