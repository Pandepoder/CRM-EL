export const ErrorCategory = {
  Validation: "validation",
  Unauthorized: "unauthorized",
  Forbidden: "forbidden",
  NotFound: "not_found",
  Conflict: "conflict",
  Domain: "domain",
  Infrastructure: "infrastructure",
  Unexpected: "unexpected"
} as const;

export type ErrorCategory = (typeof ErrorCategory)[keyof typeof ErrorCategory];

export type ErrorDiagnostic = Readonly<Record<string, unknown>>;

export class TonalaOsError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly publicMessage: string;
  public readonly diagnostic?: ErrorDiagnostic;
  public override readonly cause?: unknown;

  public constructor(input: {
    readonly code: string;
    readonly category: ErrorCategory;
    readonly message: string;
    readonly publicMessage?: string;
    readonly diagnostic?: ErrorDiagnostic;
    readonly cause?: unknown;
  }) {
    super(input.message);
    this.name = "TonalaOsError";
    this.code = input.code;
    this.category = input.category;
    this.publicMessage = input.publicMessage ?? "The request could not be completed.";
    if (input.diagnostic) {
      this.diagnostic = input.diagnostic;
    }
    if (input.cause) {
      this.cause = input.cause;
    }
  }
}

export class DomainError extends TonalaOsError {
  public constructor(input: Omit<ConstructorParameters<typeof TonalaOsError>[0], "category">) {
    super({ ...input, category: ErrorCategory.Domain });
    this.name = "DomainError";
  }
}

export class ApplicationError extends TonalaOsError {
  public constructor(
    input: Omit<ConstructorParameters<typeof TonalaOsError>[0], "category"> & {
      readonly category?: ErrorCategory;
    }
  ) {
    super({ ...input, category: input.category ?? ErrorCategory.Validation });
    this.name = "ApplicationError";
  }
}

export class InfrastructureError extends TonalaOsError {
  public constructor(input: Omit<ConstructorParameters<typeof TonalaOsError>[0], "category">) {
    super({ ...input, category: ErrorCategory.Infrastructure });
    this.name = "InfrastructureError";
  }
}

export type SafeHttpError = Readonly<{
  status: number;
  code: string;
  message: string;
  diagnostic?: ErrorDiagnostic;
}>;

const statusByCategory: Readonly<Record<ErrorCategory, number>> = {
  [ErrorCategory.Validation]: 400,
  [ErrorCategory.Unauthorized]: 401,
  [ErrorCategory.Forbidden]: 403,
  [ErrorCategory.NotFound]: 404,
  [ErrorCategory.Conflict]: 409,
  [ErrorCategory.Domain]: 422,
  [ErrorCategory.Infrastructure]: 503,
  [ErrorCategory.Unexpected]: 500
};

export function toSafeHttpError(error: unknown): SafeHttpError {
  if (error instanceof TonalaOsError) {
    const response: SafeHttpError = {
      status: statusByCategory[error.category],
      code: error.code,
      message: error.publicMessage
    };
    const diagnostic = sanitizeDiagnostic(error.diagnostic);
    return diagnostic ? { ...response, diagnostic } : response;
  }

  return {
    status: 500,
    code: "unexpected_error",
    message: "An unexpected error occurred."
  };
}

function sanitizeDiagnostic(diagnostic: ErrorDiagnostic | undefined): ErrorDiagnostic | undefined {
  if (!diagnostic) {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(diagnostic)) {
    sanitized[key] = isSensitiveKey(key) ? "[REDACTED]" : value;
  }
  return sanitized;
}

function isSensitiveKey(key: string): boolean {
  return /password|token|secret|cookie|authorization|sql/i.test(key);
}
