import { getDatabaseClient } from "./db-client";
import { schema } from "@tonala/shared/database";
import { randomUUID } from "crypto";

export async function withOutbox<T>(
  aggregateType: string,
  aggregateId: string,
  eventName: string,
  payload: Record<string, unknown>,
  actorId: string,
  transactionCallback: (tx: any) => Promise<T>
): Promise<T> {
  const db = getDatabaseClient();
  
  return db.transaction(async (tx) => {
    const result = await transactionCallback(tx);
    
    const eventId = randomUUID();
    await tx.insert(schema.transactionalOutbox).values({
      eventId,
      aggregateType,
      aggregateId,
      eventName,
      eventVersion: 1,
      payload,
      metadata: {
        actor_id: actorId,
        occurred_at: new Date().toISOString(),
        event_id: eventId,
        event_name: eventName,
        event_version: 1,
        correlation_id: `corr-${eventId}`,
        aggregate_type: aggregateType,
        aggregate_id: aggregateId
      },
      status: "pending",
      attempts: 0
    });
    
    return result;
  });
}
