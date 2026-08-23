export { assignResponsible, type AssignResponsibleInput } from "./assign-responsible.js";
export { getContactAssignment, type GetContactAssignmentInput } from "./get-contact-assignment.js";
export type {
  AssignResponsibleDependencies,
  AuditWriter,
  ContactAssignmentRepository,
  GetContactAssignmentDependencies,
  IdGenerator,
  OutboxWriter,
  TransactionContext,
  TransactionManager,
  UseCaseResult,
  UserDirectoryReader,
  UserDirectoryView
} from "./ports.js";
