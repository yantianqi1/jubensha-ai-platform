# Playable Beta Live Ops Stage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan in parallel batches, then use superpowers:verification-before-completion before claiming done.

**Goal:** Move the usable alpha into a playable beta by adding real asset job execution, live runtime delivery, guided play UX, and minimal operational identity boundaries.

**Architecture:** Keep `packages/dsl` deterministic and provider-free. Keep asset orchestration in `apps/api/src/creation`, runtime authority in `apps/api/src/runtime`, and browser workflows split by product surface in `apps/web`. All provider calls, live transports, publish actions, and identity checks must fail explicitly; no mock success, hidden fallback, silent retry, or client-side authority.

**Tech Stack:** TypeScript, NestJS, Zod, Vitest, pnpm/turbo, static web shell, HTTP/SSE first, PostgreSQL-backed repositories, existing `@jubensha/dsl` contracts.

---

## Current Baseline

Already in place:
- Studio can generate/retry/compile a StoryBible and hand package ids to Admin.
- Admin can inspect publish readiness, blockers, golden regression, asset jobs, and explicitly publish with semver.
- Play can create/start rooms, join seats, read public/seat snapshots, and submit revision-aware actions.
- Runtime supports seats, scoped snapshots, revisions, replay, and Postgres persistence.
- API contract metadata and release checklist are aligned with the usable alpha surface.

This plan starts after Usable Alpha. It should not redo completed Alpha work.

---

## Next Stage Gaps

### Real Asset Pipeline
Needed before content can look product-ready:
- Asset jobs need a real provider abstraction and explicit lifecycle transitions.
- Admin needs to see running/completed/failed job details.
- Generated asset references must be attached to deterministic manifest entries without pretending provider success.

### Live Runtime Delivery
Needed before play sessions feel alive:
- Runtime event delivery needs a transport-neutral event shape.
- First live transport should be SSE, not WebSocket, because current state is server-authoritative and mostly one-way.
- Reconnect should resume from room snapshots plus event cursor, not client mutation history.

### Guided Play Experience
Needed before non-developer users can play:
- Play UI needs a guided flow: create/start room, join seat, view private briefing, inspect available actions, submit action, refresh on conflict.
- Current raw JSON snapshot output should remain available for debugging but not be the main player experience.
- Revision conflicts should offer an explicit refresh path.

### Minimal Identity And Audit Boundary
Needed before shared usage:
- Player/operator identity must be explicit at request boundaries.
- Admin publish and provider execution actions need a minimal operator key or session boundary.
- Product-level audit events should record who triggered publish/job/runtime operations.

---

## Parallel Work Plan

### Agent A: Asset Provider Job Execution

**Write scope:** `apps/api/src/creation/**`, `apps/web/src/**`, `packages/dsl/src/**`

**Ownership:** Turn deterministic asset manifests into real queued provider work with explicit completion/failure states.

**Files:**
- Modify: `apps/api/src/creation/theme-asset-job.ts`
- Modify: `apps/api/src/creation/theme-asset-job.test.ts`
- Modify: `apps/api/src/creation/theme-asset-job.controller.ts`
- Modify: `apps/api/src/creation/theme-asset-job.controller.test.ts`
- Create: `apps/api/src/creation/theme-asset-provider.ts`
- Create: `apps/api/src/creation/theme-asset-provider.test.ts`
- Modify: `apps/api/src/creation/creation.module.ts`
- Modify: `apps/web/src/admin-view-model.ts`
- Modify: `apps/web/src/admin-view-model.test.ts`
- Modify: `apps/web/src/admin-browser-workflow.ts`
- Modify: `apps/web/src/template.ts`
- Modify: `apps/web/src/template.test.ts`
- Modify: `apps/web/src/api-client.ts`
- Modify: `apps/web/src/api-client.test.ts`

**Steps:**
1. Write failing tests for asset job states: `queued`, `running`, `completed`, and `failed`.
2. Add `ThemeAssetProvider` interface returning explicit asset results or throwing provider errors.
3. Add job executor service that transitions `queued -> running -> completed | failed`.
4. Add controller action to run a job explicitly; do not auto-complete on creation.
5. Preserve provider error details on failed jobs for Admin inspection.
6. Update Admin UI to show lifecycle, provider error, and generated asset references.
7. Run `pnpm --filter @jubensha/api test -- theme-asset` and `pnpm --filter @jubensha/web test -- admin-view-model api-client template`.

**Acceptance:** Operators can create, run, inspect, and diagnose asset jobs without any fake provider success.

---

### Agent B: Runtime SSE Event Stream

**Write scope:** `apps/api/src/runtime/**`, `apps/web/src/**`

**Ownership:** Add first live runtime delivery path while keeping runtime state authoritative and reconnect-safe.

**Files:**
- Modify: `apps/api/src/runtime/runtime-service.ts`
- Modify: `apps/api/src/runtime/runtime-service.test.ts`
- Modify: `apps/api/src/runtime/runtime-room-model.ts`
- Create: `apps/api/src/runtime/runtime-event-stream.ts`
- Create: `apps/api/src/runtime/runtime-event-stream.test.ts`
- Modify: `apps/api/src/runtime/runtime.controller.ts`
- Modify: `apps/api/src/runtime/runtime-http.test.ts`
- Modify: `apps/web/src/api-client.ts`
- Modify: `apps/web/src/api-client.test.ts`
- Modify: `apps/web/src/play-browser-workflow.ts`
- Modify: `apps/web/src/template.ts`
- Modify: `apps/web/src/template.test.ts`

**Steps:**
1. Write failing tests for transport-neutral runtime event envelopes with monotonic event ids.
2. Add `RuntimeEventStream` projection from stored room events and revisions.
3. Add HTTP/SSE route for room event stream with explicit `afterEventId` cursor support.
4. Keep snapshots as reconnect authority; event stream is delivery, not source of truth.
5. Add Web API client URL/helper for event stream discovery.
6. Add Play UI status area for stream connection and last delivered event id.
7. Run `pnpm --filter @jubensha/api test -- runtime` and `pnpm --filter @jubensha/web test -- api-client template`.

**Acceptance:** Play can subscribe to room updates via SSE and recover by reading scoped snapshots.

---

### Agent C: Guided Player Loop

**Write scope:** `apps/web/src/**`, `apps/api/src/runtime/**` if missing read data is discovered

**Ownership:** Make Play usable by a player without reading raw JSON first.

**Files:**
- Modify: `apps/web/src/play-browser-workflow.ts`
- Create: `apps/web/src/play-view-model.ts`
- Create: `apps/web/src/play-view-model.test.ts`
- Modify: `apps/web/src/play-template.ts`
- Modify: `apps/web/src/template.ts`
- Modify: `apps/web/src/template.test.ts`
- Modify: `apps/web/src/browser-app.ts`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/api-client.ts`
- Modify: `apps/web/src/api-client.test.ts`

**Steps:**
1. Write failing tests for player-facing view model: seat status, private briefing, visible clues, available actions, and revision state.
2. Render a guided Play panel that separates setup, seat/private info, clue board, actions, and debug JSON.
3. Add explicit refresh-on-conflict behavior that reads the latest seat snapshot and updates expected revision.
4. Keep private role data visible only after seat snapshot reads, never from public snapshot.
5. Preserve raw JSON output as debug evidence, not the main UX.
6. Run `pnpm --filter @jubensha/web test -- play-view-model play-browser-workflow template` and `pnpm --filter @jubensha/web typecheck`.

**Acceptance:** A player can join a seat, understand their private state, choose actions, and recover from stale revision conflicts in the Play surface.

---

### Agent D: Minimal Identity And Audit Boundary

**Write scope:** `apps/api/src/**`, `apps/web/src/**`, docs

**Ownership:** Add explicit identity boundaries for beta operations without building a full account system.

**Files:**
- Create: `apps/api/src/identity/request-identity.ts`
- Create: `apps/api/src/identity/request-identity.test.ts`
- Modify: `apps/api/src/content/content.controller.ts`
- Modify: `apps/api/src/content/content-http.test.ts`
- Modify: `apps/api/src/creation/theme-asset-job.controller.ts`
- Modify: `apps/api/src/creation/theme-asset-job.controller.test.ts`
- Modify: `apps/api/src/runtime/runtime.controller.ts`
- Modify: `apps/api/src/runtime/runtime-http.test.ts`
- Modify: `apps/api/src/request-logging.interceptor.ts`
- Modify: `apps/api/src/request-logging.interceptor.test.ts`
- Modify: `apps/web/src/admin-browser-workflow.ts`
- Modify: `apps/web/src/play-browser-workflow.ts`
- Modify: `apps/web/src/template.ts`
- Modify: `docs/operations/release-checklist.md`

**Steps:**
1. Write failing tests for required operator identity on publish and asset job run actions.
2. Write failing tests for required player identity on join/action paths.
3. Add request identity reader from explicit headers such as `x-operator-id` and `x-player-id`.
4. Add audit fields to logs for operator/player id where present.
5. Wire Web controls to send explicit operator/player ids already visible in the UI.
6. Document the beta identity boundary and its non-goals.
7. Run `pnpm --filter @jubensha/api test -- identity content runtime request-logging` and `pnpm --filter @jubensha/web test`.

**Acceptance:** Shared beta operations have explicit identity and audit boundaries without introducing a hidden auth fallback.

---

### Agent E: Beta Operations And Contract Hardening

**Write scope:** `apps/api/src/**`, `apps/web/src/**`, `docs/**`, repo root config if needed

**Ownership:** Keep the beta surface supportable after asset execution, SSE, guided play, and identity changes land.

**Files:**
- Modify: `apps/api/src/api-contract.ts`
- Modify: `apps/api/src/api-contract.test.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/web/src/product-surfaces.ts`
- Modify: `apps/web/src/product-surfaces.test.ts`
- Modify: `apps/web/scripts/build-static.mjs`
- Modify: `docs/operations/release-checklist.md`
- Modify: `docs/plans/2026-04-25-current-progress-and-next-tasks.md`

**Steps:**
1. Write failing tests for every new route introduced by asset execution, SSE, and identity boundaries.
2. Update API contract route groups and expected error codes.
3. Update static product surface generation if route-specific beta pages change.
4. Add beta smoke checklist: asset run failure, SSE reconnect, guided play action, identity-required publish.
5. Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.

**Acceptance:** The beta slice is documented, observable, testable, and route/error metadata matches actual code.

---

## Suggested Parallel Batches

- **Batch 1:** Agent A + Agent C
- **Batch 2:** Agent B
- **Batch 3:** Agent D
- **Batch 4:** Agent E

Agent A and C can run in parallel because asset execution and guided Play mostly touch separate API/UI areas. Agent B should land after Play view-model expectations are clear enough to consume stream events. Agent D should land after mutation paths stabilize. Agent E should land last to reconcile contracts, docs, and smoke checks.

---

## Integration Order

1. Merge Agent A so content assets have real explicit job execution.
2. Merge Agent C so Play has a player-facing loop on existing snapshot/action APIs.
3. Merge Agent B so live delivery enhances the guided Play loop without changing authority.
4. Merge Agent D so beta operations have explicit identity and audit fields.
5. Merge Agent E last so contract, docs, release checklist, and build outputs settle.
6. Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.

---

## Non-Goals

- No full OAuth/account/RBAC system in this stage.
- No WebSocket transport until SSE proves insufficient.
- No fake image generation or placeholder provider success.
- No client-side mutation authority over runtime state.
- No broad frontend framework rewrite.
- No monetization, payment, or public marketplace work.

---

## Final Verification

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected:
- Asset jobs can be explicitly run and inspected through success and failure.
- Play has a guided player loop and live SSE delivery backed by authoritative snapshots.
- Admin/player operations carry explicit identity where required.
- API contract, logs, release checklist, and product surfaces match the beta behavior.
