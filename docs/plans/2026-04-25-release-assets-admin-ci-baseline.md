# Release Assets, Admin Workbench, and CI Baseline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan with parallel workers, then use superpowers:verification-before-completion before claiming done.

**Goal:** Move from deterministic planning surfaces to a release-ready slice with explicit asset generation jobs, a usable admin review workbench, publish-time blocking checks, and CI/observability baselines.

**Architecture:** Keep generation requests deterministic at the boundary and put provider execution behind explicit injected interfaces. `apps/api/src/creation` owns asset/release orchestration, `apps/api/src/content` owns publish mutations, `apps/web` owns Studio/Admin surfaces, and repo-level config owns CI. Failures must stay visible; no fallback image generation, no auto-approval, no hidden publish bypass.

**Tech Stack:** TypeScript, NestJS, Zod, Vitest, static web build, pnpm/turbo, existing `@jubensha/dsl`, existing API/Web package boundaries.

---

## Current Baseline

Already implemented:
- `StoryBible` contract, planner/critic orchestration, compiler, simulation and flow diagnostics.
- `ThemeToken` and deterministic theme asset manifest compiler.
- `POST /creation/theme-assets/compile` for read-only asset request manifests.
- `QualityGate`, `golden-packages`, `review-workbench`, and `publish-review` read-only review surfaces.
- Web product surfaces for `play-web`, `studio-web`, and `admin-web`.
- API contract discovery and structured `ApiClientError`.

This plan starts from that baseline and should not rewrite the existing pipeline.

---

## Parallel Work Plan

### Agent A: Explicit Asset Generation Jobs

**Write scope:** `apps/api/src/creation/**`, `apps/web/src/api-client.ts`, `apps/web/src/api-client.test.ts`

**Ownership:** Turn deterministic asset manifests into explicit queued job records without integrating a real image provider yet.

**Files:**
- Create: `apps/api/src/creation/theme-asset-job.ts`
- Create: `apps/api/src/creation/theme-asset-job.test.ts`
- Create: `apps/api/src/creation/theme-asset-job.controller.ts`
- Create: `apps/api/src/creation/theme-asset-job.controller.test.ts`
- Modify: `apps/api/src/creation/creation.module.ts`
- Modify: `apps/api/src/api-contract.ts`
- Modify: `apps/api/src/api-contract.test.ts`
- Modify: `apps/web/src/api-client.ts`
- Modify: `apps/web/src/api-client.test.ts`

**Steps:**
1. Write a failing test for creating an asset job from a StoryBible and compiled manifest.
2. Implement a pure in-memory job store with states `queued | failed | completed` and explicit `requestedAssets`.
3. Write controller tests for `POST /creation/theme-assets/jobs` and `GET /creation/theme-assets/jobs/:jobId`.
4. Implement the controller with injected job service and explicit request validation.
5. Add API contract entries for asset job routes.
6. Add Web API client methods `createThemeAssetJob()` and `getThemeAssetJob()`.
7. Keep provider execution out of scope; queued means queued, not fake completed.
8. Run `pnpm --filter @jubensha/api test -- theme-asset-job api-contract` and `pnpm --filter @jubensha/web test -- api-client`.

**Acceptance:** Users can create and inspect explicit asset generation jobs, but no fake image success is returned.

---

### Agent B: Publish-Time Gate Enforcement

**Write scope:** `apps/api/src/content/**`, `apps/api/src/creation/**`

**Ownership:** Ensure publishing a package is blocked when release checks fail, using the existing quality gate and publish review logic.

**Files:**
- Modify: `apps/api/src/content/content-service.ts`
- Modify: `apps/api/src/content/content-service.test.ts`
- Modify: `apps/api/src/content/content.controller.ts`
- Modify: `apps/api/src/content/content-http.test.ts`
- Create: `apps/api/src/content/publish-gate.ts`
- Create: `apps/api/src/content/publish-gate.test.ts`
- Modify: `apps/api/src/content/content.module.ts`
- Modify: `apps/api/src/api-contract.ts`
- Modify: `apps/api/src/api-contract.test.ts`

**Steps:**
1. Write a failing unit test showing `publishDraft()` rejects a draft with quality-gate blockers.
2. Implement `PublishGate` as an injected dependency that returns explicit blocker diagnostics.
3. Wire `ContentService.publishDraft()` through `PublishGate` before creating a released version.
4. Keep semver validation and existing content validation behavior intact.
5. Write HTTP tests verifying publish failure returns a structured error body with blockers.
6. Update API contract errors for publish routes.
7. Run `pnpm --filter @jubensha/api test -- content publish-gate api-contract`.

**Acceptance:** Publish is no longer only read-reviewable; invalid drafts are blocked at mutation time with explicit diagnostics.

---

### Agent C: Admin Review Workbench UI

**Write scope:** `apps/web/src/**`

**Ownership:** Make `admin-web` consume publish review and asset job APIs instead of being a placeholder panel.

**Files:**
- Modify: `apps/web/src/api-client.ts`
- Modify: `apps/web/src/api-client.test.ts`
- Create: `apps/web/src/admin-view-model.ts`
- Create: `apps/web/src/admin-view-model.test.ts`
- Modify: `apps/web/src/template.ts`
- Modify: `apps/web/src/template.test.ts`
- Modify: `apps/web/src/browser-app.ts`
- Modify: `apps/web/src/styles.css`

**Steps:**
1. Write API client tests for `getPublishReview(packageId)` and asset job endpoints.
2. Add admin view-model helpers that summarize readiness, blockers, golden regression, and quality counts.
3. Add admin form controls for package ID and review fetch action.
4. Render publish readiness, blockers, and regression summary in `admin-web` only.
5. Add browser wiring that surfaces `ApiClientError` details visibly.
6. Add optional asset job inspection panel; do not mark jobs complete in the UI.
7. Run `pnpm --filter @jubensha/web test && pnpm --filter @jubensha/web typecheck`.

**Acceptance:** Admin can inspect a package’s publish readiness and asset job status from the split admin surface.

---

### Agent D: CI And Observability Baseline

**Write scope:** repo root config, `apps/api/src/**`, docs if needed

**Ownership:** Add reproducible CI checks and explicit request/error logging baseline without changing business behavior.

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `apps/api/src/request-logging.interceptor.ts`
- Create: `apps/api/src/request-logging.interceptor.test.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `docs/operations/release-checklist.md`

**Steps:**
1. Write a failing unit test for request logging that records method, path, status, and error code.
2. Implement a small Nest interceptor with injected logger interface.
3. Register the interceptor globally only if it does not hide exceptions.
4. Add CI workflow running `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm typecheck`, and `pnpm build`.
5. Add release checklist documenting review, publish gate, asset jobs, and rollback checks.
6. Run `pnpm --filter @jubensha/api test -- request-logging` and inspect workflow syntax locally if possible.

**Acceptance:** The project has a clear automated verification baseline and visible request/error logging for release hardening.

---

### Agent E: Multiplayer Groundwork Assessment

**Write scope:** `docs/plans/**`, optionally `apps/api/src/runtime/**` tests only

**Ownership:** Prepare, but do not implement, the multiplayer room-state work from the roadmap.

**Files:**
- Create: `docs/plans/2026-04-25-multiplayer-runtime-groundwork.md`
- Optionally create: `apps/api/src/runtime/multiplayer-scope-notes.test.ts`

**Steps:**
1. Inspect current runtime room state, scope, replay, and NPC event flow.
2. Document exact missing primitives for multiplayer: seats, private/public broadcasts, reconnect snapshots, observer mode, and concurrency checks.
3. Define non-goals for this phase: no websocket server, no matchmaking, no live multiplayer UI.
4. If useful, add tests that lock current single-room behavior before future multiplayer changes.
5. Run targeted runtime tests.

**Acceptance:** Multiplayer work is made explicit and sequenced after release/admin hardening, preventing premature architectural churn.

---

## Recommended Parallel Batches

### Batch 1
- Agent A: Asset generation jobs.
- Agent C: Admin review UI client/view-model shell.
- Agent D: CI and observability baseline.

These mostly touch separate files. Agent C may wait for final API paths from Agent A, but can build view-model and template in parallel.

### Batch 2
- Agent B: Publish-time gate enforcement.
- Agent E: Multiplayer groundwork assessment.

Agent B should run after publish review semantics stabilize. Agent E is documentation-heavy and should not block release hardening.

---

## Integration Order

1. Merge Agent A first so asset job contracts are stable.
2. Merge Agent C and adjust client paths if Agent A changed route names.
3. Merge Agent D after API tests are green.
4. Merge Agent B and verify publish mutation behavior against the full content test suite.
5. Merge Agent E documentation last.
6. Run full verification.

---

## Non-Goals

- No real image model/provider execution.
- No fake completed asset jobs.
- No public marketplace or matchmaking.
- No websocket/multiplayer runtime implementation.
- No hidden publish bypass.
- No broad frontend framework migration.

---

## Final Verification

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected:
- Asset generation jobs are explicit and inspectable.
- Publish attempts are blocked by explicit quality diagnostics when invalid.
- Admin surface can inspect release readiness and asset job state.
- CI and request/error logging baseline are present.
- Multiplayer next steps are documented without destabilizing the current single-player runtime.
