export class PermanentOutboxError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PermanentOutboxError";
  }
}

export class RetryPolicy {
  public constructor(
    public readonly maxAttempts = 5,
    private readonly baseDelaySeconds = 5,
    private readonly maxDelaySeconds = 300
  ) {}

  public nextDelaySeconds(attempt: number): number {
    return Math.min(this.baseDelaySeconds * 2 ** Math.max(0, attempt - 1), this.maxDelaySeconds);
  }

  public shouldDeadLetter(attempt: number, error: unknown): boolean {
    return error instanceof PermanentOutboxError || attempt >= this.maxAttempts;
  }
}

export function sanitizeOutboxError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/password|token|secret|cookie|authorization|sql/gi, "[REDACTED]")
    .slice(0, 500);
}
