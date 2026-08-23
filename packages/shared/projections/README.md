# Projection Engine Contracts

This package defines the generic Projection Engine contracts for Tonala OS.

The domain is the source of truth. Domain events describe facts that already happened. A projection consumes those events and updates a read model optimized for queries. A read model is derived data and can be rebuilt when sufficient event history is available.

Projection processing is eventually consistent. It does not promise immediate consistency, exactly-once processing, perfect global ordering or Event Sourcing.

Projection identity is stable and composed of `projectionName + projectionVersion`, for example `walking_skeleton + v1`. Semantic changes require a new projection version.

The registry is in-memory and deterministic. It registers projection definitions, rejects duplicate identities, resolves definitions by event name and event version, and never executes handlers or accesses PostgreSQL.

Live processing and rebuild processing are separate modes. Future live processing will use live projection receipts; future rebuild processing will use separate rebuild receipts. Block 9A.1 only defines contracts and registry behavior.

## Persistence Added In 9A.2

Block 9A.2 adds PostgreSQL persistence for projection state and receipts only. It does not add a live runner, rebuild runner, Outbox integration, read model effect, Command Center table or UI.

Tables:

- `projection_states`: current operational state, checkpoint, failure metadata and optimistic concurrency version for a projection identity.
- `projection_event_receipts`: live-processing idempotency per `projectionName + projectionVersion + eventId`.
- `projection_rebuild_receipts`: rebuild-processing idempotency per `rebuildId + projectionName + projectionVersion + eventId`.

State is not a receipt. A checkpoint records observed progress using `eventCreatedAt + eventId`, but it does not prove an event effect was applied. Receipts are the idempotency barrier.

Live receipts and rebuild receipts are intentionally separate. A rebuild must not be blocked by live receipts, and two rebuild executions can independently process the same historical event.

`projection_states.version` provides optimistic concurrency for mutable state updates. Successful updates increment `version` and refresh `updatedAt`; stale updates return a typed conflict.

Projection receipts do not store payloads, metadata blobs or personal data. They also do not use a hard foreign key to `transactional_outbox`, preserving future retention and archive options.

9A.3 and 9A.4 use these repositories inside a shared PostgreSQL transaction with the read model effect, receipt insert and checkpoint update.

## Live Runner Added In 9A.3

`LiveProjectionRunner` orchestrates one normalized `ProjectionEvent` in live mode. It resolves compatible projections through `ProjectionRegistry`, executes them sequentially in deterministic `projectionName + projectionVersion` order, and uses one PostgreSQL transaction per event/projection.

Inside that transaction the live receipt is reserved before the handler runs. If the receipt already exists, the handler is skipped. If the handler fails, the transaction rolls back and the receipt is not kept. A successful transaction commits the handler effect, live receipt and checkpoint together.

Blocked states are explicit:

- `active`: process live events.
- `paused`: block and return a retryable result.
- `failed`: block until operational intervention.
- `rebuilding`: block live processing for the same projection identity.
- `deprecated`: skip without blocking other projections.

The runner stops after the first failed projection in the MVP. Previous successful projections keep their effects and receipts. A retry skips those receipts and resumes at the previously failed projection.

9A.3 does not integrate with the Outbox Worker, does not create `projection_engine.v1` global receipts, does not implement a production projection, and does not implement rebuild processing.

## Outbox Integration Added In 9A.4

Block 9A.4 adds the technical live integration between the existing Outbox Worker and the Projection Engine.

Flow:

`OutboxWorker -> ProjectionEventConsumer(projection_engine.v1) -> LiveProjectionRunner -> projection definition -> read model writer`

The Projection Engine is registered from `scripts/composition/projection-engine.ts`. This is the composition boundary that is allowed to know both Outbox and Projections. `packages/shared/outbox` must not import `packages/shared/projections`, and `packages/shared/projections` must not import Outbox or any business module.

Idempotency has two layers:

- Global outbox receipt: `outbox_consumer_receipts` for `projection_engine.v1`. It is written only after all applicable projections succeed or already have internal receipts.
- Internal projection receipt: `projection_event_receipts` per `projectionName + projectionVersion + eventId`. It protects each projection effect from duplicates.

The first concrete read model is `walking_skeleton_projection_v1`, owned by Command Center infrastructure. It is a technical projection only. It counts the five Walking Skeleton events and tracks the greatest `last_event_at`. It does not expose dashboard APIs, UI, KPIs, rebuild processing, shadow tables or cutover behavior.

If one projection succeeds and a later projection fails, the successful projection keeps its read model effect and internal receipt. The global `projection_engine.v1` receipt is not created, the Outbox event remains retryable, and the next worker pass skips already-receipted projections before resuming the failed one.

The Outbox Worker runs this consumer automatically through `pnpm outbox:run-once` and the regular worker composition. Manual replay and rebuild remain future operational capabilities.
