import { type CorrelationId, type EntityId } from "@tonala/shared/kernel";

export type ContactId = EntityId;

export type ContactSummary = Readonly<{
  contactId: ContactId;
  displayName: string;
  status: "active" | "inactive";
  createdAt: string;
  version: number;
}>;

export type ContactStatusView = Readonly<{
  contactId: ContactId;
  status: "active" | "inactive";
  version: number;
}>;

export type ContactListItem = Readonly<{
  contactId: ContactId;
  displayName: string;
  phone: string | null;
  colony: string | null;
  municipality?: string | null;
  sectionNum?: number | null;
  availability: string | null;
  skill: string | null;
  status: "active" | "inactive";
  createdAt: string;
  territoryColonyName: string | null;
  responsibleName: string | null;
  lastVisitStatus: string | null;
}>;

export type ContactDetail = Readonly<{
  contactId: ContactId;
  displayName: string;
  phoneNumber: string | null;
  colony?: string | null;
  municipality?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  status: "active" | "inactive";
  createdAt: string;
  territory: {
    colonyId: string;
    colonyName: string | null;
    linkedAt: string;
    linkedByUserId: string | null;
  } | null;
  section: {
    sectionId: string;
    sectionNum: number;
  } | null;
  assignment: {
    assignedUserId: string;
    assignedUserName: string | null;
    status: "active" | "pending";
    assignedAt: string;
    assignedByUserId: string | null;
  } | null;
  visits: Array<{
    visitId: string;
    scheduledAt: string;
    status: string;
    outcome: string | null;
    summary: string | null;
    assignedUserName: string | null;
  }>;
}>;

export interface ContactsReader {
  getContactStatus(contactId: EntityId): Promise<ContactStatusView | null>;
  listContacts(options?: {
    assignedUserId?: EntityId;
    /**
     * Usuarios cuyo trabajo puede ver quien consulta. Antes era una sola
     * persona, así que un contacto solo se podía acotar a su autor; con equipos
     * hace falta el conjunto, que lo calcula la capa web y se pasa aquí.
     */
    scopedUserIds?: readonly EntityId[];
    q?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: ContactListItem[]; total: number }>;
  getContactDetail(contactId: EntityId, scopedUserIds?: readonly EntityId[]): Promise<ContactDetail | null>;
}

export type ContactRegisteredV1Payload = Readonly<{
  contact_id: string;
  created_by_user_id: string;
  created_at: string;
}>;

export type ContactRegisteredV1Metadata = Readonly<{
  event_id: string;
  event_name: "ContactRegistered.v1";
  event_version: 1;
  occurred_at: string;
  correlation_id: CorrelationId;
  actor_id: string;
  aggregate_type: "contact";
  aggregate_id: string;
}>;

export type ContactRegisteredV1 = Readonly<{
  name: "ContactRegistered.v1";
  version: 1;
  payload: ContactRegisteredV1Payload;
  metadata: ContactRegisteredV1Metadata;
}>;
