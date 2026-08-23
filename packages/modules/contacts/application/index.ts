export { getContactById, type GetContactByIdInput } from "./get-contact-by-id.js";
export { listContacts } from "./list-contacts.js";
export { getContactDetail, type GetContactDetailInput } from "./get-contact-detail.js";
export {
  registerMinimalContact,
  type RegisterMinimalContactInput
} from "./register-minimal-contact.js";
export {
  registerExtendedContact,
  type ExtendedContactInput,
  type ExtendedContactRepository,
  type RegisterExtendedContactDependencies
} from "./register-extended-contact.js";
export type {
  AuditWriter,
  ContactRepository,
  GetContactByIdDependencies,
  GetContactDetailDependencies,
  IdGenerator,
  ListContactsDependencies,
  OutboxWriter,
  RegisterMinimalContactDependencies,
  TransactionContext,
  TransactionManager,
  UseCaseResult
} from "./ports.js";
