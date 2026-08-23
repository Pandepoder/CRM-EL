# ADR-012: Tonala OS V1 Utilizable Y Web-First

## Status

Accepted

## Context

Tonala OS completed its Walking Skeleton baseline (`v0.1.0-walking-skeleton`, ADR-010). That phase validated architecture, domain modules, Outbox, Projection Engine and PostgreSQL integration.

The product must now move from a technical prototype to a **usable V1** that Edgar and the territorial team can operate daily. Field use matters, but the **primary delivery target is a web application** optimized for desktop and laptop workflows, with **responsive layout** so the same product works on phones without a separate mobile-only app.

The previous operability draft (`PRODUCT_OPERABILITY_PLAN_MOBILE_FIRST.md`) assumed mobile-first navigation and a dev HTML prototype as interim delivery. That direction is superseded by this ADR.

## Decision

### 1. Target release

The next official product milestone is **`v1.0.0-usable`**, not another walking skeleton increment.

V1 means:

- real login and session;
- Next.js as delivery layer (ADR-003);
- CRM operable end-to-end in the browser;
- map and team areas present at minimum viable depth defined in `PRODUCT_OPERABILITY_PLAN_V1.md`;
- no dependency on dev-only controls (manual outbox button, setup endpoint in UI, spoofed permission headers).

Walking Skeleton artifacts remain in the codebase as validated infrastructure. They are **inputs** to V1, not the user-facing product definition.

### 2. Web-first responsive UX

Design and implement for **web first**:

- primary layouts for viewport `>= 1024px` (sidebar, split panels, tables where appropriate);
- responsive degradation for tablet and phone (`768px`, `480px` breakpoints);
- touch targets `>= 44px` on all breakpoints;
- one codebase, one URL, no separate native app for V1.

On small screens, primary navigation may collapse to bottom tabs or a drawer, but **desktop is not a secondary afterthought**.

### 3. Delivery layer

Replace the Node static dev server as the product shell:

- `apps/web` becomes a **Next.js App Router** application;
- HTTP adapters move to route handlers or server actions that invoke application use cases only;
- `packages/ui` hosts shared React components and layout primitives;
- development actor headers remain only for `local`/`test` automated tests, not for the V1 UI.

### 4. Projection and read models for V1

`walking_skeleton_projection_v1` stays as a technical counter projection. V1 additionally requires **operational read models** exposed to the UI:

- contact list / search summary;
- contact detail aggregate;
- visits by contact and by assigned user;
- `Mi dia` summary for the current actor.

These may be query services or projections. They must not bypass module boundaries.

### 5. Outbox processing

V1 must not require operators to manually process the outbox. Event consumption runs automatically after writes (in-process worker pass or background job in the same deployment).

## Options Considered

| Option | Outcome |
|--------|---------|
| Continue mobile-first SPA + dev server | Fast for demos, not usable V1 |
| Native mobile app first | High cost, splits delivery |
| Web-first Next.js responsive | Matches team workflow, one deploy |
| Desktop-only web | Excludes field phones |

## Consequences

Benefits:

- clear product milestone beyond infrastructure;
- aligns with ADR-003 (Next.js delivery);
- desktop coordinators get efficient layouts; field users keep phone access;
- walking skeleton code is reused, not discarded.

Costs:

- Next.js migration work;
- new read models and APIs for lists aggregates;
- auth integration before production;
- documentation and ADR maintenance.

## Risks

- Treating responsive CSS as "enough" without testing real phones;
- rebuilding CRM UI without fixing backend list endpoints;
- Scope creep (full map + full team module before CRM is daily-usable).

Mitigation: implement V1 in increments defined in `PRODUCT_OPERABILITY_PLAN_V1.md`; CRM complete flow before map polish.

## Supersedes

- Mobile-first as **primary** UX strategy in product docs;
- `apps/web/public` prototype as target UI;
- experimental "delivery placeholder" status for `apps/web` in ADR-010.

Does **not** supersede:

- modular monolith boundaries (ADR-001, ADR-002);
- permission model in application layer (ADR-008);
- Drizzle, Outbox, Projection Engine decisions.

## Future Work After V1

- PMTiles performance pass for map;
- push notifications;
- offline-first PWA;
- advanced Command Center KPIs;
- multi-municipio (explicitly out of V1).
