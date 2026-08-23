import { LogLevel } from "@tonala/shared/observability";

import { type OutboxProcessingSummary } from "../contracts/index.js";
import { type OutboxWorkerDependencies, type RunOnceInput } from "./ports.js";

export class OutboxWorker {
  public constructor(private readonly dependencies: OutboxWorkerDependencies) {}

  public async runOnce(input: RunOnceInput): Promise<OutboxProcessingSummary> {
    const startedAt = performance.now();
    const now = this.dependencies.clock.now();
    await this.dependencies.outboxRepository.recoverAbandoned({
      abandonedBefore: new Date(now.getTime() - input.abandonedTimeoutSeconds * 1000),
      nextAttemptAt: now
    });
    const events = await this.dependencies.outboxRepository.claimPending({
      batchSize: input.batchSize,
      workerId: input.workerId,
      now
    });

    const mutable = {
      claimed: events.length,
      processed: 0,
      retried: 0,
      deadLettered: 0,
      skippedByReceipt: 0,
      failed: 0
    };

    for (const event of events) {
      const result = await this.dependencies.dispatcher.dispatch(event, {
        workerId: input.workerId,
        processingStartedAt: this.dependencies.clock.now()
      });
      mutable.skippedByReceipt += result.skippedByReceipt;
      if (result.status === "processed") mutable.processed += 1;
      if (result.status === "retried") mutable.retried += 1;
      if (result.status === "dead_letter") mutable.deadLettered += 1;
      if (result.failed) mutable.failed += 1;
    }

    this.dependencies.logger.log(LogLevel.Info, "Outbox batch completed", {
      actorId: input.workerId,
      durationMs: Math.round(performance.now() - startedAt),
      operation: "outbox.runOnce",
      success: true,
      details: { batchSize: input.batchSize, ...mutable }
    });

    return mutable;
  }
}
