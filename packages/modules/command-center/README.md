# Command Center

Command Center owns executive read models for Tonala OS.

In Block 9A.4 it owns one technical projection: `walking_skeleton_projection_v1` (Walking Skeleton baseline).

V1 (`v1.0.0-usable`) adds operational read models for UI; see `docs/PRODUCT_OPERABILITY_PLAN_V1.md`. The walking skeleton projection remains a technical counter; it does not replace contact list, detail or Mi dia read models.

Scope:

- Count `ContactRegistered`, `ContactLinkedToColony`, `ResponsibleAssigned`, `VisitScheduled` and `VisitCompleted`.
- Keep one global row with `projection_key = 'global'`.
- Update counters, `last_event_at` and `version` only from Projection Engine live processing.
- Read the snapshot through `DrizzleWalkingSkeletonProjectionReader`.

Out of scope:

- Dashboard APIs.
- Dashboard UI.
- Executive KPIs.
- Rebuild runner.
- Shadow projection tables.
- Projection cutover.

The projection definition lives in `projections/` and contains no database, delivery or Outbox dependency. The PostgreSQL writer lives in `infrastructure/` because it is a read-model adapter.
