export type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

export type Result<TValue, TError = Error> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError };

export function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value };
}

export function err<TError>(error: TError): Result<never, TError> {
  return { ok: false, error };
}

export type EntityId = Brand<string, "EntityId">;
export type CorrelationId = Brand<string, "CorrelationId">;

export function createEntityId(value: string): EntityId {
  assertNonEmpty(value, "EntityId");
  return value as EntityId;
}

export function createCorrelationId(value: string): CorrelationId {
  assertNonEmpty(value, "CorrelationId");
  return value as CorrelationId;
}

export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  public now(): Date {
    return new Date();
  }
}

export type EventMetadata = Readonly<{
  eventId: EntityId;
  correlationId: CorrelationId;
  occurredAt: Date;
  actorId?: EntityId;
  source: string;
}>;

export type DomainEvent<TName extends string, TPayload extends object> = Readonly<{
  name: TName;
  version: number;
  payload: Readonly<TPayload>;
  metadata: EventMetadata;
}>;

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} cannot be empty`);
  }
}
