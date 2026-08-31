import { type ActorContext } from "@tonala/shared/auth";
import { type CorrelationId } from "@tonala/shared/kernel";

export const LogLevel = {
  Debug: "debug",
  Info: "info",
  Warn: "warn",
  Error: "error"
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export type LogFields = Readonly<{
  correlationId?: CorrelationId;
  actorId?: string;
  operation?: string;
  durationMs?: number;
  success?: boolean;
  errorCode?: string;
  entityType?: string;
  entityId?: string;
  details?: Readonly<Record<string, unknown>>;
}>;

export type LogEntry = Readonly<{
  timestamp: string;
  level: LogLevel;
  message: string;
}> & LogFields;

export interface Logger {
  log(level: LogLevel, message: string, fields?: LogFields): void;
}

export class InMemoryLogger implements Logger {
  public readonly entries: LogEntry[] = [];

  public log(level: LogLevel, message: string, fields: LogFields = {}): void {
    this.entries.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...redactLogFields(fields)
    });
  }
}

export class DevelopmentLogger implements Logger {
  public log(level: LogLevel, message: string, fields: LogFields = {}): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...redactLogFields(fields)
    };

    if (level === LogLevel.Error) {
      console.error(JSON.stringify(entry));
    } else if (level === LogLevel.Warn) {
      console.warn(JSON.stringify(entry));
    }
  }
}

export async function measureOperation<T>(input: {
  readonly logger: Logger;
  readonly operation: string;
  readonly actor?: ActorContext;
  readonly correlationId?: CorrelationId;
  readonly run: () => Promise<T>;
}): Promise<T> {
  const startedAt = performance.now();
  try {
    const result = await input.run();
    input.logger.log(LogLevel.Info, "Operation completed", compactLogFields({
      actorId: input.actor?.actorId,
      correlationId: input.correlationId ?? input.actor?.correlationId,
      durationMs: Math.round(performance.now() - startedAt),
      operation: input.operation,
      success: true
    }));
    return result;
  } catch (error) {
    input.logger.log(LogLevel.Error, "Operation failed", compactLogFields({
      actorId: input.actor?.actorId,
      correlationId: input.correlationId ?? input.actor?.correlationId,
      durationMs: Math.round(performance.now() - startedAt),
      errorCode: error instanceof Error ? error.name : "unknown_error",
      operation: input.operation,
      success: false
    }));
    throw error;
  }
}

export function redactLogFields(fields: LogFields): LogFields {
  return fields.details ? { ...fields, details: redactRecord(fields.details) } : fields;
}

function compactLogFields(fields: {
  readonly correlationId?: CorrelationId | undefined;
  readonly actorId?: string | undefined;
  readonly operation: string;
  readonly durationMs: number;
  readonly success: boolean;
  readonly errorCode?: string | undefined;
}): LogFields {
  const compacted: {
    correlationId?: CorrelationId;
    actorId?: string;
    operation?: string;
    durationMs?: number;
    success?: boolean;
    errorCode?: string;
  } = {
    operation: fields.operation,
    durationMs: fields.durationMs,
    success: fields.success
  };
  if (fields.correlationId) compacted.correlationId = fields.correlationId;
  if (fields.actorId) compacted.actorId = fields.actorId;
  if (fields.errorCode) compacted.errorCode = fields.errorCode;
  return compacted;
}

function redactRecord(record: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  if (!record || typeof record !== "object") return {};
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    redacted[key] = /password|token|secret|cookie|authorization|phone|email/i.test(key)
      ? "[REDACTED]"
      : value;
  }
  return redacted;
}
