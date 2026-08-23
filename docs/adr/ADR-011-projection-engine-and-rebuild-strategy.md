# ADR-011 Projection Engine And Rebuild Strategy

## Status

Accepted

## Context

Tonala OS already has a Transactional Outbox, an Outbox Worker, consumer receipts and versioned domain events. The next operational layer needs rebuildable read models for future modules such as Command Center without querying transactional domain tables directly.

The domain remains the source of truth. Projections are derived models with eventual consistency. They must not promise immediate consistency, exactly-once processing, perfect global ordering or Event Sourcing.

The current events are:

- `ContactRegistered.v1`
- `ContactLinkedToColony.v1`
- `ResponsibleAssigned.v1`
- `VisitScheduled.v1`
- `VisitCompleted.v1`

These v1 events are stable and must not be silently modified.

## Decision

Create a generic Projection Engine in `packages/shared/projections`. Concrete projections live inside the module that owns the read model they update.

Future Outbox integration will use a hybrid strategy:

`Outbox Worker -> ProjectionEventConsumer -> ProjectionRegistry -> applicable projections`

The global consumer name is stable and equivalent to `projection_engine.v1`.

Each projection is identified by `projectionName + projectionVersion`, for example `walking_skeleton + v1`.

Live processing uses internal `projection_event_receipts`. Rebuild processing will use separate `projection_rebuild_receipts`. These receipts must not be mixed.

The global `outbox_consumer_receipt` for `projection_engine.v1` may only be persisted after all applicable projections have completed successfully or already have their internal receipt. If one projection fails, successful projections keep their effects and internal receipts, the failed projection rolls back its transaction, no global Projection Engine receipt is created, and the event is retried later. On retry, projections with internal receipts are skipped.

The Outbox to Projection integration must live in a composition point outside shared packages. Shared Outbox cannot depend on Projections, and shared Projections cannot depend on Outbox, Command Center or other bounded contexts.

Rebuilds will use a shadow/blue-green strategy with small transactions, separate rebuild receipts, independent checkpoints, validation before cutover, rollback support and no unsafe dynamic SQL.

`transactional_outbox` may be retained as a temporary replay archive for upcoming projection work, but it is not an Event Store. A future `event_archive` must be evaluated before historical outbox retention is reduced.

Command Center must read projection read models through its own contracts and must not query transactional domain tables directly.

## Alternatives

Each projection as a direct Outbox consumer: this gives natural outbox receipts per projection, but creates excessive consumer registration, makes rebuild coordination harder and increases operational coupling.

A single consumer without internal receipts: this is simpler, but one failed projection would force all projections to rerun and could duplicate effects.

In-place rebuild: this is operationally simple, but can corrupt or interrupt active reads and makes rollback difficult.

Querying domain tables directly: this is faster initially, but couples Command Center to transactional schemas and makes future read model evolution brittle.

Full Event Sourcing: this would provide stronger replay semantics, but is beyond the MVP and would add unnecessary complexity to the modular monolith.

## Consequences

Benefits:

- read models stay decoupled from domain internals;
- projection effects can be idempotent per projection version;
- rebuilds can be validated before cutover;
- future Command Center can evolve without querying transactional tables;
- failures can be isolated to a projection.

Costs and limitations:

- projection receipts and rebuild receipts require additional persistence in a future block;
- operators must understand eventual consistency;
- historical replay depends on retaining sufficient event payloads;
- dead letters can block rebuilds by default;
- no exactly-once guarantee is provided.

## Failure Semantics

The global `projection_engine.v1` receipt is created only after all applicable projections have succeeded or already have internal receipts.

Partial success is preserved through internal projection receipts. A retry only executes pending projections.

A single projection failure does not immediately change the entire Projection Engine to failed. Repeated or permanent failures may pause or fail the affected projection in a future state repository.

For the MVP live runner, processing stops after the first failed applicable projection. Previously committed projections are not compensated, and later projections wait for a retry.

Dead-lettered events relevant to a projection block rebuild by default until explicitly resolved or excluded by an approved operational policy.

## Event History Policy

`transactional_outbox` is retained temporarily for replay. It does not constitute an Event Store.

Historical events must not be deleted while rebuildable projections depend on them.

A future event archive strategy must define retention, payload compatibility, security, schema evolution and replay guarantees before the outbox is treated as non-historical operational data.

## Rebuild Strategy

Rebuilds use a shadow target. Events are applied in small transactions. Live receipts and rebuild receipts are separate. Rebuild checkpoints are independent from live checkpoints.

The rebuilt target is validated before cutover. Cutover must be reversible, and rollback must leave the previously active read model available.

Rebuild implementation must avoid unsafe dynamic SQL and must not modify domain tables.
