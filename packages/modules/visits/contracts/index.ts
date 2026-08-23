import { type CorrelationId, type EntityId } from "@tonala/shared/kernel";

export type VisitId = EntityId;
export type VisitStatus = "scheduled" | "completed";
export type VisitOutcome = "successful" | "no_contact" | "follow_up_required" | "rejected";
export type VisitSummary = string;

export type VisitSummaryView = Readonly<{
  visitId: VisitId;
  contactId: EntityId;
  colonyId: EntityId;
  assignedUserId: EntityId;
  scheduledAt: string;
  status: VisitStatus;
  visitLocationText: string;
  createdAt: string;
  completedAt: string | null;
  completedByUserId: EntityId | null;
  outcome: VisitOutcome | null;
  summary: VisitSummary | null;
  version: number;
}>;

export type VisitScheduledV1Payload = Readonly<{
  visit_id: string;
  contact_id: string;
  assigned_user_id: string;
  colony_id: string;
  scheduled_at: string;
}>;

export type VisitScheduledV1Metadata = Readonly<{
  event_id: string;
  event_name: "VisitScheduled.v1";
  event_version: 1;
  occurred_at: string;
  correlation_id: CorrelationId;
  actor_id: string;
  aggregate_type: "visit";
  aggregate_id: string;
}>;

export type VisitScheduledV1 = Readonly<{
  name: "VisitScheduled.v1";
  version: 1;
  payload: VisitScheduledV1Payload;
  metadata: VisitScheduledV1Metadata;
}>;

export type VisitCompletedV1Payload = Readonly<{
  visit_id: string;
  contact_id: string;
  completed_by_user_id: string;
  completed_at: string;
  outcome: VisitOutcome;
}>;

export type VisitCompletedV1Metadata = Readonly<{
  event_id: string;
  event_name: "VisitCompleted.v1";
  event_version: 1;
  occurred_at: string;
  correlation_id: CorrelationId;
  actor_id: string;
  aggregate_type: "visit";
  aggregate_id: string;
}>;

export type VisitCompletedV1 = Readonly<{
  name: "VisitCompleted.v1";
  version: 1;
  payload: VisitCompletedV1Payload;
  metadata: VisitCompletedV1Metadata;
}>;

export interface VisitsReader {
  getVisitById(visitId: VisitId): Promise<VisitSummaryView | null>;
  listVisitsByContact(contactId: EntityId): Promise<VisitListItem[]>;
  listVisitsForUser(userId: string, onlyToday?: boolean): Promise<MyDayVisit[]>;
}

export type VisitListItem = Readonly<{
  visitId: VisitId;
  scheduledAt: string;
  status: VisitStatus;
  visitLocationText: string;
  outcome: VisitOutcome | null;
  summary: string | null;
  completedAt: string | null;
  assignedUserName: string | null;
}>;

export type MyDayVisit = Readonly<{
  visitId: VisitId;
  contactId: EntityId;
  contactName: string;
  colonyName: string | null;
  scheduledAt: string;
  status: VisitStatus;
  visitLocationText: string;
  outcome: VisitOutcome | null;
}>;
