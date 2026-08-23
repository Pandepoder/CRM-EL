# ADR-010: Baseline Walking Skeleton

## Status

Accepted

## Context

Tonala OS completed and validated its Walking Skeleton through:

- modular monolith;
- bounded contexts;
- Shared Kernel;
- ActorContext;
- permission-based authorization;
- PostgreSQL;
- Drizzle;
- reproducible migrations;
- Contacts;
- Territory;
- Assignments;
- Visits;
- Transactional Outbox;
- Outbox Worker;
- consumer receipts;
- concurrency control;
- audit;
- unit tests;
- PostgreSQL integration;
- E2E;
- architecture boundary checker.

The pre-baseline validation records:

- 19 test files;
- 87 passing tests;
- successful `pnpm validate`;
- verified migrations 0001-0006.

## Decision

Freeze this state as the official architecture baseline:

`v0.1.0-walking-skeleton`

The domain remains the source of truth.

Future increments must extend the system through public contracts, events, consumers and read models, without directly accessing internals from other modules.

Public contracts, v1 events and existing migrations must not be silently modified. Any incompatible change requires a new contract, a new event version, a new migration and, when appropriate, an ADR.

## Stable Baseline

Consider stable:

- `packages/shared/kernel`;
- `packages/shared/auth`;
- error taxonomy;
- ActorContext;
- public contracts for Contacts;
- public contracts for Territory;
- public contracts for Assignments;
- public contracts for Visits;
- Outbox contracts;
- existing v1 events;
- migrations 0001-0006;
- consumer receipts;
- boundary checker.

## Experimental Areas (at baseline freeze)

At `v0.1.0-walking-skeleton` these were experimental:

- `apps/web` as delivery placeholder;
- command-center beyond technical projection;
- routes;
- governance;
- future projection consumers;
- UI;
- production deployment.

**Update (2026-08-14):** ADR-012 supersedes the experimental status of `apps/web`, UI and production delivery. The Walking Skeleton baseline remains frozen; V1 work (`v1.0.0-usable`) builds on top. See `docs/PRODUCT_OPERABILITY_PLAN_V1.md`.

## Consequences

Benefits:

- reproducible baseline;
- stabilized module boundaries;
- future changes comparable against a known state;
- evolution through small increments;
- read models decoupled from the domain.

Costs:

- incompatible changes will require explicit versioning;
- projections will need rebuild policies;
- CI will be needed before increasing collaborators or deployments.

## Future Work

- Testing Strategy ADR;
- Transactional Outbox ADR;
- Release Strategy ADR;
- CI;
- Projection Engine;
- projection consumers;
- read models;
- Command Center;
- separate deployment for staging and production.
