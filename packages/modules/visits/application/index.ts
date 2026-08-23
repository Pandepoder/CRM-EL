export { completeVisit, type CompleteVisitInput } from "./complete-visit.js";
export { getVisitById, type GetVisitByIdInput } from "./get-visit-by-id.js";
export { scheduleVisit, type ScheduleVisitInput } from "./schedule-visit.js";
export { listVisitsByContact, type ListVisitsByContactInput } from "./list-visits-by-contact.js";
export { listVisitsForUser, type ListVisitsForUserInput } from "./list-visits-for-user.js";
export type {
  AuditWriter,
  CompleteVisitDependencies,
  GetVisitByIdDependencies,
  IdGenerator,
  ListVisitsByContactDependencies,
  ListVisitsForUserDependencies,
  OutboxWriter,
  ScheduleVisitDependencies,
  TransactionContext,
  TransactionManager,
  UseCaseResult,
  VisitRepository,
  VisitResultRepository
} from "./ports.js";
