# Usable Alpha Stage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan in parallel batches, then use superpowers:verification-before-completion before claiming done.

**Goal:** Move the project from a runnable product slice into a usable alpha where an operator can create a story, review and compile it, publish it safely, start a room, join seats, and inspect scoped runtime state without leaving the product shell.

**Architecture:** Keep DSL pure and deterministic, keep creation and review orchestration in `apps/api/src/creation`, keep runtime authority in `apps/api/src/runtime`, and keep the browser shell surface-driven in `apps/web`. This stage should not add silent fallbacks, fake completions, or client-side authority; it should make each workflow explicit, connected, and inspectable.

**Tech Stack:** TypeScript, NestJS, Zod, Vitest, pnpm/turbo, static web shell, PostgreSQL-backed repositories, existing `@jubensha/dsl` contracts.

---

## Current Baseline

Already in place:
- StoryBible generation, critic/planner orchestration, draft compilation, flow diagnostics, simulation, and quality gating.
- Publish review, publish gate enforcement, explicit theme asset jobs, and review workbench endpoints.
- Product surfaces for `play-web`, `studio-web`, and `admin-web`.
- Runtime rooms, seat assignment, join, scoped snapshots, revision-aware actions, replay, and Postgres persistence.
- API contract metadata, request logging, CI workflow, and release checklist.
- Studio handoff that writes compiled draft package ids into the Admin package id field.

This stage starts from a working local slice and closes the remaining gaps needed for a real alpha user journey.

---

## Alpha Gaps To Close

### Studio To Publish Handoff
Needed before alpha users can finish authoring:
- Show generation attempts, diff summaries, and compile readiness in one browser flow.
- Make it obvious when a generated StoryBible can be compiled and reviewed.
- Keep failures explicit so the author sees what failed and where.

### Admin Review And Release Action
Needed before operators can actually manage releases:
- Show publish review, asset job status, and publish blockers in a single workflow.
- Add an explicit publish action path that is still blocked by the publish gate when invalid.
- Keep asset jobs inspectable even when provider work is not yet integrated.

### Runtime Play Flow
Needed before play mode feels usable:
- Let the browser join seats and read public/seat snapshots without exposing hidden role data.
- Keep runtime actions revision-aware in the UI and API.
- Make reconnect-safe reads available before any live transport is added.

### Observability And Product Boundaries
Needed before the alpha can be supported:
- Keep API contract, error codes, and route groups aligned with the browser shell.
- Keep release logs and smoke checks attached to the actual runnable slice.
- Avoid widening the surface area before the current workflows are complete.

---

## Parallel Work Plan

### Agent A: Studio Alpha Workflow

**Write scope:** `apps/web/src/**`, `apps/api/src/creation/**`

**Ownership:** Make Studio the place where a user can generate, retry, compare, compile, and hand off a story without leaving the shell.

**Files:**
- Modify: `apps/web/src/studio-view-model.ts`
- Modify: `apps/web/src/studio-view-model.test.ts`
- Modify: `apps/web/src/studio-browser-workflow.ts`
- Modify: `apps/web/src/studio-browser-workflow.test.ts`
- Modify: `apps/web/src/browser-app.ts`
- Modify: `apps/web/src/template.ts`
- Modify: `apps/web/src/template.test.ts`
- Modify: `apps/web/src/api-client.ts`
- Modify: `apps/web/src/api-client.test.ts`
- Modify: `apps/api/src/creation/creation-orchestrator.ts`
- Modify: `apps/api/src/creation/creation-orchestrator.test.ts`
- Modify: `apps/api/src/creation/creation-service.ts`
- Modify: `apps/api/src/creation/creation-service.test.ts`

**Steps:**
1. Write a failing test for a Studio flow that shows attempt summaries, retry diff text, and compile readiness together.
2. Add explicit view-model helpers for retry comparison and publish-review handoff messages.
3. Expose compile result metadata needed to populate Admin review without manual copy/paste.
4. Update browser wiring so generated output, retry state, and compile output are readable in one place.
5. Keep error messages explicit when generation or compile fails.
6. Run `pnpm --filter @jubensha/web test && pnpm --filter @jubensha/web typecheck`.

**Acceptance:** Studio can be used as the alpha authoring surface for one complete story creation loop.

---

### Agent B: Admin Release Workflow

**Write scope:** `apps/api/src/creation/**`, `apps/web/src/**`

**Ownership:** Make Admin the operational surface for release readiness, asset inspection, and explicit publish action.

**Files:**
- Modify: `apps/api/src/creation/publish-review.controller.ts`
- Modify: `apps/api/src/creation/publish-review.controller.test.ts`
- Modify: `apps/api/src/content/content-service.ts`
- Modify: `apps/api/src/content/content-service.test.ts`
- Modify: `apps/api/src/content/publish-gate.ts`
- Modify: `apps/api/src/content/publish-gate.test.ts`
- Modify: `apps/api/src/creation/theme-asset-job.ts`
- Modify: `apps/api/src/creation/theme-asset-job.controller.ts`
- Modify: `apps/api/src/creation/theme-asset-job.controller.test.ts`
- Modify: `apps/web/src/admin-view-model.ts`
- Modify: `apps/web/src/admin-view-model.test.ts`
- Modify: `apps/web/src/browser-app.ts`
- Modify: `apps/web/src/template.ts`
- Modify: `apps/web/src/template.test.ts`
- Modify: `apps/web/src/api-client.ts`
- Modify: `apps/web/src/api-client.test.ts`

**Steps:**
1. Write a failing test for an Admin panel that combines publish review, blockers, golden regression, and asset job inspection.
2. Add an explicit publish action path in the API surface that still obeys `PublishGate`.
3. Keep asset jobs inspectable even when job status is only queued or failed.
4. Add browser-side state and labels that make the release decision visible to the operator.
5. Keep the Admin panel read/write boundaries explicit and avoid hidden completion.
6. Run `pnpm --filter @jubensha/api test -- creation content` and `pnpm --filter @jubensha/web test -- admin-view-model api-client`.

**Acceptance:** Operators can inspect release readiness and only publish when the gate allows it.

---

### Agent C: Play Alpha Runtime Flow

**Write scope:** `apps/api/src/runtime/**`, `apps/web/src/**`

**Ownership:** Make the play surface usable for joining seats, reading snapshots, and applying actions with explicit revision control.

**Files:**
- Modify: `apps/api/src/runtime/runtime-service.ts`
- Modify: `apps/api/src/runtime/runtime-room-model.ts`
- Modify: `apps/api/src/runtime/runtime-snapshot.ts`
- Modify: `apps/api/src/runtime/runtime.controller.ts`
- Modify: `apps/api/src/runtime/runtime-http.test.ts`
- Modify: `apps/api/src/runtime/runtime-service.test.ts`
- Modify: `apps/api/src/runtime/runtime-multiplayer.test.ts`
- Modify: `apps/api/src/runtime/postgres-runtime-repository.ts`
- Modify: `apps/api/src/runtime/postgres-runtime-schema.ts`
- Modify: `apps/web/src/api-client.ts`
- Modify: `apps/web/src/api-client.test.ts`
- Modify: `apps/web/src/browser-app.ts`
- Modify: `apps/web/src/template.ts`
- Modify: `apps/web/src/template.test.ts`
- Modify: `apps/web/src/product-surfaces.ts`
- Modify: `apps/web/src/product-surfaces.test.ts`

**Steps:**
1. Write failing tests for join-seat, public snapshot, and seat-private snapshot interactions from the browser shell.
2. Keep revision conflicts explicit and visible in the UI.
3. Add any missing reconnect-safe read helpers needed for the next UI step, but do not add SSE/WebSocket yet.
4. Keep public projections from leaking role secrets.
5. Run `pnpm --filter @jubensha/api test -- runtime` and `pnpm --filter @jubensha/api typecheck`.

**Acceptance:** The play surface can start a room, join seats, read scoped state, and surface revision conflicts explicitly.

---

### Agent D: Productization And Release Support

**Write scope:** `apps/api/src/**`, `apps/web/src/**`, repo root config/docs if needed

**Ownership:** Make the alpha supportable by tightening routes, errors, logs, and release docs.

**Files:**
- Modify: `apps/api/src/api-contract.ts`
- Modify: `apps/api/src/api-contract.test.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/request-logging.interceptor.ts`
- Modify: `apps/web/src/app-runtime-config.ts`
- Modify: `apps/web/src/main.ts`
- Modify: `apps/web/scripts/build-static.mjs`
- Modify: `docs/operations/release-checklist.md`
- Modify: `docs/plans/2026-04-25-current-progress-and-next-tasks.md`

**Steps:**
1. Write failing tests for any route or error-code drift introduced by the alpha workflow.
2. Keep request logging and contract metadata in sync with the new runtime and admin paths.
3. Keep static page generation aligned with the product surface routes.
4. Update the release checklist to reflect the alpha end-to-end smoke flow.
5. Run `pnpm test && pnpm typecheck && pnpm build`.

**Acceptance:** The alpha is documented, observable, and stable enough to support repeated local use.

---

## Suggested Parallel Batches

- **Batch 1:** Agent A + Agent B
- **Batch 2:** Agent C
- **Batch 3:** Agent D

Agent A and B can run in parallel because Studio creation flow and Admin release workflow mostly touch separate browser and API paths. Agent C should land after the release handoff is stable. Agent D should land last so contract and routing metadata can settle.

---

## Integration Order

1. Merge Agent A so authoring is complete enough for a real user loop.
2. Merge Agent B so release operators can inspect and act on publish readiness.
3. Merge Agent C so play mode becomes truly usable from the browser.
4. Merge Agent D last so the alpha is supportable and documented.
5. Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.

---

## Non-Goals

- No websocket or SSE transport in this stage.
- No authentication or role-based access control system yet.
- No real image provider integration unless it can be added without hidden fallback.
- No live multiplayer UI beyond explicit seat join and scoped reads.
- No broad redesign of the existing static web stack.

---

## Final Verification

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected:
- Studio supports a real authoring loop.
- Admin supports release readiness inspection and explicit publish gating.
- Play supports seat join, scoped snapshots, and revision-aware actions.
- Route/error/logging metadata stays aligned with the actual API surface.
