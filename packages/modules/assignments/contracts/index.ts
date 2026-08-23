import { type CorrelationId, type EntityId } from "@tonala/shared/kernel";

export type ContactAssignmentSummary = Readonly<{
  contactId: EntityId;
  assignedUserId: EntityId;
  assignmentStatus: "active" | "pending";
  assignedAt: string;
  version: number;
}>;

export type AssignResponsibleResult = Readonly<{
  contactAssignment: ContactAssignmentSummary;
  changed: boolean;
  idempotent: boolean;
}>;

export type ResponsibleAssignedV1Payload = Readonly<{
  contact_id: string;
  assigned_user_id: string;
  assigned_by_user_id: string;
  assigned_at: string;
}>;

export type ResponsibleAssignedV1Metadata = Readonly<{
  event_id: string;
  event_name: "ResponsibleAssigned.v1";
  event_version: 1;
  occurred_at: string;
  correlation_id: CorrelationId;
  actor_id: string;
  aggregate_type: "contact_assignment";
  aggregate_id: string;
}>;

export type ResponsibleAssignedV1 = Readonly<{
  name: "ResponsibleAssigned.v1";
  version: 1;
  payload: ResponsibleAssignedV1Payload;
  metadata: ResponsibleAssignedV1Metadata;
}>;

export interface AssignmentsReader {
  getContactAssignment(contactId: EntityId): Promise<ContactAssignmentSummary | null>;
}
