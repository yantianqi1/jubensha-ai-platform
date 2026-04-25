# Full Usable Product Roadmap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan in parallel batches, then use superpowers:verification-before-completion before claiming done.

**Goal:** Turn the current demo-grade platform into a product that supports a real end-to-end workflow: create story, evaluate quality, review assets, publish safely, and play/reconnect with explicit runtime state.

**Architecture:** Keep `packages/dsl` deterministic and pure, keep creation/review logic in `apps/api/src/creation`, keep runtime authority in `apps/api/src/runtime`, and keep the product shell in `apps/web`. All new behavior must stay explicit: no mock success, no hidden fallback, no silent auto-approval, and no client-side authority over room state.

**Tech Stack:** TypeScript, NestJS, Zod, Vitest, pnpm/turbo, static web app shell, PostgreSQL-backed persistence, existing `@jubensha/dsl` contracts.

---

## Current Baseline

Already implemented:
- StoryBible schema, planner/critic orchestration, compiler, package flow diagnostics, simulation, and quality gate.
- Theme token schema, theme asset manifest compiler, explicit asset jobs, and publish review surfaces.
- Product surfaces for `studio-web`, `play-web`, and `admin-web`.
- Runtime rooms, seat assignment, scoped snapshots, revision-aware actions, and replayable event history.
- API contract metadata, request logging, and release checklist.

This roadmap does **not** restart from zero. It assumes the current codebase already runs locally and focuses on the missing steps for real usability.

---

## Usability Gaps To Close

### End-to-End Creation Flow
Needed before product release:
- A single Studio flow that can create a story bible, inspect planner/critic output, retry generation, compile a draft, and hand the result into publish review.
- Clear diff visibility between generation attempts and between generated vs compiled output.
- Explicit failure surfaces when generation or validation fails.

### Real Asset Pipeline
Needed before operators can use the system:
- Asset provider integration behind an explicit interface.
- Asset job lifecycle that is inspectable from Admin.
- No fake completion, no hidden image generation, and no silent fallback when provider calls fail.

### Release And Review Workflow
Needed before controlled publishing:
- Publish review that aggregates quality gate, simulation, and golden regression results.
- Admin workbench that can inspect readiness, blockers, and asset job state.
- Publish-time blocking must stay enforced at mutation time.

### Runtime Usability
Needed before play mode is practical:
- Seat join and snapshot reads exposed in the HTTP API and UI.
- Revision-aware actions, reconnect snapshots, and observer/public projections.
- A transport decision for live updates: SSE or WebSocket, but only after the snapshot/revision model is stable.

### Product Operations
Needed before the system is maintainable:
- Error code consistency across API/UI.
- CI, logs, and smoke checks that verify the release slice.
- Release checklist usage in the actual workflow, not just in docs.

---

## Parallel Work Plan

### Agent A: Studio Creation Flow

**Write scope:** `apps/web/src/**`, `apps/api/src/creation/**`

**Ownership:** Make Studio the primary authoring surface for a real creation loop.

**Files:**
- Modify: `apps/web/src/studio-view-model.ts`
- Modify: `apps/web/src/studio-view-model.test.ts`
- Modify: `apps/web/src/studio-browser-workflow.ts`
- Modify: `apps/web/src/studio-browser-workflow.test.ts`
- Modify: `apps/web/src/template.ts`
- Modify: `apps/web/src/template.test.ts`
- Modify: `apps/web/src/browser-app.ts`
- Modify: `apps/web/src/api-client.ts`
- Modify: `apps/web/src/api-client.test.ts`
- Modify: `apps/api/src/creation/creation-orchestrator.ts`
- Modify: `apps/api/src/creation/creation-orchestrator.test.ts`

**Steps:**
1. Add tests for a full Studio flow: generate → inspect diagnostics → retry → compile draft.
2. Expose attempt-by-attempt diff data and human-readable retry summaries in the view model.
3. Keep generation failures explicit and visible in the browser shell.
4. Wire the browser UI so Studio is the default working surface for creation tasks.
5. Ensure the API client and browser workflow expose all data needed for retry and comparison.
6. Run `pnpm --filter @jubensha/web test && pnpm --filter @jubensha/web typecheck`.

**Acceptance:** Studio can be used as the authoring surface for a real story-bible creation loop without leaving the browser.

---

### Agent B: Runtime Completion Path

**Write scope:** `apps/api/src/runtime/**`, `apps/web/src/**`

**Ownership:** Finish the runtime primitives required for real play sessions.

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
- Modify: `apps/web/src/product-surfaces.ts`
- Modify: `apps/web/src/product-surfaces.test.ts`

**Steps:**
1. Add reconnect snapshot and observer snapshot tests.
2. Add revision-aware action request tests for stale update conflicts.
3. Add explicit transport-neutral broadcast event shaping if needed before SSE/WebSocket.
4. Expose runtime reads and joins in the web client and product shell.
5. Keep runtime state authoritative server-side only.
6. Run `pnpm --filter @jubensha/api test -- runtime && pnpm --filter @jubensha/api typecheck`.

**Acceptance:** Play mode has explicit seat join, scoped state reads, conflict detection, and reconnect-safe snapshots.

---

### Agent C: Release Review And Asset Pipeline

**Write scope:** `apps/api/src/creation/**`, `apps/web/src/**`, `packages/dsl/src/**`

**Ownership:** Make release review and asset jobs operational for real operators.

**Files:**
- Modify: `apps/api/src/creation/theme-asset-compiler.ts`
- Modify: `apps/api/src/creation/theme-asset-job.ts`
- Modify: `apps/api/src/creation/theme-asset-job.controller.ts`
- Modify: `apps/api/src/creation/theme-assets.controller.ts`
- Modify: `apps/api/src/creation/quality-gate.ts`
- Modify: `apps/api/src/creation/golden-packages.ts`
- Modify: `apps/api/src/creation/publish-review.controller.ts`
- Modify: `apps/api/src/creation/review-workbench.controller.ts`
- Modify: `apps/web/src/admin-view-model.ts`
- Modify: `apps/web/src/admin-view-model.test.ts`
- Modify: `apps/web/src/template.ts`
- Modify: `apps/web/src/template.test.ts`
- Modify: `apps/web/src/browser-app.ts`
- Modify: `packages/dsl/src/theme-token-schema.ts`

**Steps:**
1. Add provider abstraction for asset generation without faking success.
2. Expand Admin review surfaces to show publish blockers, golden regression, and asset job state.
3. Add test coverage for provider failures, not just queued jobs.
4. Keep publish-time gate enforcement active and explicit.
5. Keep deterministic manifests as the source of truth for asset requests.
6. Run `pnpm --filter @jubensha/api test -- creation && pnpm --filter @jubensha/web test -- admin-view-model api-client`.

**Acceptance:** Operators can review release readiness, inspect asset jobs, and publish only when checks pass.

---

### Agent D: Productization And Operations

**Write scope:** `apps/api/src/**`, `apps/web/src/**`, repo root config/docs if needed

**Ownership:** Tighten the release slice into something supportable.

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/request-logging.interceptor.ts`
- Modify: `apps/api/src/api-contract.ts`
- Modify: `apps/api/src/api-contract.test.ts`
- Modify: `apps/web/src/app-runtime-config.ts`
- Modify: `apps/web/src/main.ts`
- Modify: `turbo.json` if outputs need tightening
- Modify: `docs/operations/release-checklist.md`
- Modify: `docs/plans/*` as release notes evolve

**Steps:**
1. Normalize API error codes and route metadata used by the UI.
2. Confirm request logging covers the release-critical paths.
3. Tighten the product shell so each surface exposes only its intended controls.
4. Add smoke-testable release commands to the checklist.
5. Keep documentation aligned with the actual runtime and review behavior.
6. Run `pnpm test && pnpm typecheck && pnpm build`.

**Acceptance:** The product boundaries, errors, and release process are clear enough for routine use.

---

## Suggested Parallel Batches

- **Batch 1:** Agent A + Agent C
- **Batch 2:** Agent B
- **Batch 3:** Agent D

Agent A and C can run in parallel because Studio creation flow and release/asset surfaces touch different write areas. Agent B should land before any live-play UI polish. Agent D should land last, once route and UI contracts stabilize.

---

## Integration Order

1. Merge Agent A so creation flow becomes usable for real authoring.
2. Merge Agent C so release review and assets are operational for operators.
3. Merge Agent B so play mode is truly reconnect-safe and conflict-aware.
4. Merge Agent D last so the release slice is hardened and documented.
5. Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.

---

## Non-Goals

- No authentication or multi-tenant account system in this slice.
- No websocket/SSE transport until runtime snapshots and revision handling are stable.
- No automatic image success or hidden provider fallback.
- No silent retry loops for generation, release, or runtime actions.
- No full redesign of the existing static web stack.

---

## Final Verification

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected:
- Studio supports a full authoring loop.
- Runtime play is reconnect-safe and conflict-aware.
- Review/admin surfaces expose release blockers and asset job state.
- Release and observability behavior stays explicit, testable, and stable.
