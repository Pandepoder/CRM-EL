import { describe, expect, it } from "vitest";

import {
  ApplicationError,
  DomainError,
  ErrorCategory,
  InfrastructureError,
  toSafeHttpError
} from "./index.js";

describe("shared errors", () => {
  it("maps validation errors to safe HTTP responses", () => {
    const error = new ApplicationError({
      code: "invalid_input",
      category: ErrorCategory.Validation,
      message: "Internal validation detail",
      publicMessage: "Invalid input.",
      diagnostic: { field: "name", sql: "select secret" }
    });

    expect(toSafeHttpError(error)).toEqual({
      status: 400,
      code: "invalid_input",
      message: "Invalid input.",
      diagnostic: { field: "name", sql: "[REDACTED]" }
    });
  });

  it("distinguishes domain and infrastructure errors", () => {
    expect(toSafeHttpError(new DomainError({ code: "domain_rule", message: "Rule failed" })).status)
      .toBe(422);
    expect(toSafeHttpError(new InfrastructureError({ code: "db_down", message: "Connection refused" })).status)
      .toBe(503);
  });

  it("does not expose unexpected error details", () => {
    expect(toSafeHttpError(new Error("stack with secret"))).toEqual({
      status: 500,
      code: "unexpected_error",
      message: "An unexpected error occurred."
    });
  });
});
