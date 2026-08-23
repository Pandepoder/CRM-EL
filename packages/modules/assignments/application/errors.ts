import { ApplicationError, ErrorCategory } from "@tonala/shared/errors";

export function notFoundError(code: string, message: string, publicMessage: string): ApplicationError {
  return new ApplicationError({ code, category: ErrorCategory.NotFound, message, publicMessage });
}

export function conflictError(code: string, message: string, publicMessage: string): ApplicationError {
  return new ApplicationError({ code, category: ErrorCategory.Conflict, message, publicMessage });
}

export function validationError(code: string, message: string, publicMessage: string): ApplicationError {
  return new ApplicationError({ code, category: ErrorCategory.Validation, message, publicMessage });
}
