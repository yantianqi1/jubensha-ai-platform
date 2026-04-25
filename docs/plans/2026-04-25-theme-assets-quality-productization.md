# Theme Assets, Quality Gate, and Productization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan with parallel workers, then use superpowers:verification-before-completion before claiming done.

**Goal:** Turn the current creator pipeline into a more complete product slice by adding theme/material generation hooks, pre-release quality gates, a richer Studio workflow, and clearer product boundaries.

**Architecture:** Keep responsibilities split by layer. `packages/dsl` stays deterministic and evaluation-heavy. `apps/api/src/creation` owns orchestration, content quality, and publish-time validation. `apps/web` owns Studio UI and product surfaces. Productization work should stay additive and avoid hidden fallback behavior.

**Tech Stack:** TypeScript, NestJS, Zod, Vitest, existing `@jubensha/dsl`, existing `@jubensha/api` and `@jubensha/web`, static web build, workspace package boundaries.

---

## Current Baseline

Already implemented:
- `StoryBible` schema, validation, planner/critic agents, creation orchestration, compile pipeline.
- `ScriptPackage` simulation and flow diagnostics.
- Studio generation form, attempt summary, relation edge and diff helpers.
- Basic static web demo and API integration.

This plan starts from that baseline and should not rewrite it.

---

## Parallel Work Plan

### Agent A: Theme And Asset Contracts

**Write scope:** `apps/api/src/creation/**`, `packages/dsl/src/**`

**Ownership:** Theme token schema, asset manifest schema, and deterministic payload shaping for cover/character/clue assets.

**Files:**
- Create: `packages/dsl/src/theme-token-schema.ts`
- Create: `packages/dsl/src/theme-token-schema.test.ts`
- Create: `apps/api/src/creation/theme-asset-compiler.ts`
- Create: `apps/api/src/creation/theme-asset-compiler.test.ts`
- Modify: `packages/dsl/src/index.ts`
- Modify: `apps/api/src/creation/creation-orchestrator.ts` or new API helper files if needed

**Steps:**
1. Write a failing test for a `ThemeToken` contract that includes tone, palette, motifs, cover direction, character portrait cues, and clue visual cues.
2. Implement a deterministic DSL schema for `ThemeToken` and an asset-facing manifest shape.
3. Write a failing test for compiling a `StoryBible` into an asset request payload.
4. Implement a pure `compileThemeAssets` helper that maps story bible content to cover/character/clue generation prompts or descriptors.
5. Keep the asset payload explicit and structured; do not call model providers from helper functions.
6. Export the new schema/helper from package entry points as appropriate.
7. Run `pnpm --filter @jubensha/dsl test` and `pnpm --filter @jubensha/api test -- creation`.

**Acceptance:** Theme tokens and asset requests are deterministic, typed, and reusable by future image-generation or design systems.

---

### Agent B: Pre-Release Quality Gate

**Write scope:** `apps/api/src/creation/**`, `packages/dsl/src/**`

**Ownership:** Human review workflow, golden package regression set, and publish-time validation surface.

**Files:**
- Create: `apps/api/src/creation/quality-gate.ts`
- Create: `apps/api/src/creation/quality-gate.test.ts`
- Create: `apps/api/src/creation/golden-packages.ts`
- Create: `apps/api/src/creation/golden-packages.test.ts`
- Create: `apps/api/src/creation/review-workbench.controller.ts`
- Create: `apps/api/src/creation/review-workbench.controller.test.ts`
- Modify: `apps/api/src/creation/creation.module.ts`

**Steps:**
1. Write a failing quality-gate test for a valid draft package that passes all checks.
2. Implement a `quality-gate` service that aggregates DSL validation, flow diagnostics, simulation diagnostics, and release-only checks.
3. Write a failing test for a golden package regression loader that can compare current output against named fixtures.
4. Implement `golden-packages` as explicit fixtures or manifest entries, not hidden snapshots.
5. Write a failing controller test for a review workbench route that returns a structured review summary.
6. Implement a read-only review workbench endpoint for human review data.
7. Keep failures explicit; do not auto-approve invalid packages.
8. Run `pnpm --filter @jubensha/api test -- creation`.

**Acceptance:** Drafts can be reviewed against deterministic checks and regression fixtures before publish.

---

### Agent C: Studio Workflow Expansion

**Write scope:** `apps/web/src/**`

**Ownership:** More interactive Studio surfaces for story editing, relation editing, retry comparison, and generated output inspection.

**Files:**
- Modify: `apps/web/src/studio-view-model.ts`
- Modify: `apps/web/src/studio-view-model.test.ts`
- Modify: `apps/web/src/template.ts`
- Modify: `apps/web/src/template.test.ts`
- Modify: `apps/web/src/browser-app.ts`
- Modify: `apps/web/src/styles.css`

**Steps:**
1. Write tests for a structured story skeleton editor state, relation edge formatting, and diff summaries across revisions.
2. Add explicit story skeleton editing fields to the Studio panel.
3. Add a relation graph section that can render and refresh character edges from StoryBible data.
4. Add retry comparison output that shows the last two generation attempts and field-level differences.
5. Add a clear action to hand generated StoryBible back into the compile-draft panel.
6. Keep errors visible and avoid silent defaults.
7. Run `pnpm --filter @jubensha/web test && pnpm --filter @jubensha/web typecheck`.

**Acceptance:** Studio can edit, inspect, retry, and compare generated story content without leaving the browser.

---

### Agent D: Productization And Boundary Cleanup

**Write scope:** `apps/api/src/**`, `apps/web/src/**`, repo root config/docs if needed

**Ownership:** Route boundaries, API contract clean-up, CI/error/logging baseline, and product split guidance.

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/app-config.ts` or a new config helper if needed
- Modify: `apps/web/src/main.ts`
- Modify: `apps/web/src/app-runtime-config.ts`
- Modify: `turbo.json` if build/test outputs need tightening
- Modify: `docs/plans/*` or root docs if route/product split should be documented

**Steps:**
1. Write a route-map test or API bootstrap test that confirms creation, generation, runtime, and content remain separate modules.
2. Introduce explicit `studio-web`, `play-web`, and `admin-web` product naming in routes or config comments/docs without moving functionality prematurely.
3. Standardize API error payloads in creation endpoints so Studio can render them consistently.
4. Add basic structured logging hooks or error-code surfaces where missing, without swallowing exceptions.
5. Tighten CI/test/build metadata only if the current workspace output model needs it.
6. Keep productization additive and reversible.
7. Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.

**Acceptance:** The platform has clearer module and product boundaries, and Studio/API error handling is consistent enough for later split-out work.

---

## Integration Order

1. Merge Agent A first because theme and asset descriptors will be reused by later review and Studio work.
2. Merge Agent B next because review and regression gates should exist before broader Studio polish.
3. Merge Agent C in parallel with B if its changes remain UI-only; otherwise merge after B.
4. Merge Agent D last after the API and UI contracts settle.
5. Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.

---

## Suggested Parallel Batches

- **Batch 1:** Agent A + Agent C
- **Batch 2:** Agent B
- **Batch 3:** Agent D

If Agent C needs new API fields from Agent A, merge A before C’s final integration only.

---

## Non-Goals For This Phase

- No real image generation pipeline.
- No admin UI rewrite.
- No public matchmaking.
- No database schema migration for unrelated domains.
- No silent fallback for generation or review.

---

## Final Verification

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected:
- Theme and asset helpers compile and test cleanly.
- Quality gate returns explicit review data for good and bad drafts.
- Studio can render richer edit/compare/retry information.
- Productization changes do not break existing API/web boundaries.
