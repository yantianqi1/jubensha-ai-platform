# Post-Productization Next Phase Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan with parallel workers, then use superpowers:verification-before-completion before claiming done.

**Goal:** Complete the next product phase by splitting product surfaces, tightening release governance, and preparing the theme/image pipeline for production use.

**Architecture:** Keep `packages/dsl` deterministic, `apps/api/src/creation` authoritative for creation and review flows, and `apps/web` split into explicit product surfaces. Release governance should stay explicit and read-only until publish checks pass. No hidden fallback paths, no silent approvals.

**Tech Stack:** TypeScript, NestJS, Zod, Vitest, static web build, workspace package boundaries.

---

## Current Baseline

Already in place:
- StoryBible schema, compiler, planner/critic, quality gate, theme asset compiler.
- Studio generation workflow, diff/retry UI, review workbench endpoint.
- API contract and product-surface route constants.

This plan starts from that baseline and should only add the missing release/productization pieces.

---

## Parallel Work Plan

### Agent A: Theme Asset Delivery Surface

**Write scope:** `apps/api/src/creation/**`, `apps/web/src/**`, `packages/dsl/src/**`

**Ownership:** Connect theme tokens and asset manifests to a real delivery surface for cover, character, and clue image requests.

**Files:**
- Modify: `apps/api/src/creation/theme-asset-compiler.ts`
- Modify: `apps/api/src/creation/theme-asset-compiler.test.ts`
- Create: `apps/api/src/creation/theme-assets.controller.ts`
- Create: `apps/api/src/creation/theme-assets.controller.test.ts`
- Modify: `apps/api/src/creation/creation.module.ts`
- Modify: `apps/web/src/api-client.ts`
- Modify: `apps/web/src/api-client.test.ts`

**Steps:**
1. Write a failing test for a read-only endpoint that returns compiled theme asset requests for a StoryBible.
2. Implement the controller to return the deterministic manifest from `compileThemeAssets`.
3. Add API client support for fetching the theme asset manifest.
4. Add a Web test that verifies the manifest can be loaded and rendered in the Studio surface.
5. Keep the endpoint explicit and read-only; do not call image providers here.
6. Run `pnpm --filter @jubensha/api test -- theme-assets` and `pnpm --filter @jubensha/web test -- api-client`.

**Acceptance:** The system can expose deterministic asset requests for future image generation without introducing provider coupling.

---

### Agent B: Release Governance Expansion

**Write scope:** `apps/api/src/creation/**`

**Ownership:** Human review summary, golden regression fixtures, and publish-time checks that block invalid release states explicitly.

**Files:**
- Modify: `apps/api/src/creation/quality-gate.ts`
- Modify: `apps/api/src/creation/quality-gate.test.ts`
- Modify: `apps/api/src/creation/golden-packages.ts`
- Modify: `apps/api/src/creation/golden-packages.test.ts`
- Modify: `apps/api/src/creation/review-workbench.controller.ts`
- Modify: `apps/api/src/creation/review-workbench.controller.test.ts`
- Create: `apps/api/src/creation/publish-review.controller.ts`
- Create: `apps/api/src/creation/publish-review.controller.test.ts`

**Steps:**
1. Write a failing test for a publish review summary that combines DSL validation, flow diagnostics, simulation diagnostics, and golden regression results.
2. Extend `QualityGate` to expose a publish-ready summary that is still explicit about all diagnostics.
3. Add a read-only publish review endpoint that returns the aggregated summary.
4. Expand golden fixtures to cover one or two representative draft packages and one intentional mismatch case.
5. Keep invalid packages invalid; never auto-approve them.
6. Run `pnpm --filter @jubensha/api test -- quality-gate golden-packages review-workbench publish-review`.

**Acceptance:** Release review has a deterministic, auditable gate before publish.

---

### Agent C: Product Surface Split

**Write scope:** `apps/web/src/**`, repo root config if needed

**Ownership:** Separate the web app into explicit `studio-web`, `play-web`, and `admin-web` surfaces without rewriting the frontend stack.

**Files:**
- Modify: `apps/web/src/product-surfaces.ts`
- Modify: `apps/web/src/product-surfaces.test.ts`
- Modify: `apps/web/src/template.ts`
- Modify: `apps/web/src/template.test.ts`
- Modify: `apps/web/src/browser-app.ts`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/main.ts`

**Steps:**
1. Write a failing test for distinct route/header affordances for studio, play, and admin surfaces.
2. Implement surface-aware shell rendering and navigation labels.
3. Ensure each surface only exposes the controls it needs.
4. Keep the current static build and API client wiring intact.
5. Run `pnpm --filter @jubensha/web test && pnpm --filter @jubensha/web typecheck`.

**Acceptance:** The UI is visibly partitioned into product surfaces instead of one blended demo page.

---

### Agent D: API Contract And Error Baseline

**Write scope:** `apps/api/src/**`, `apps/web/src/**`

**Ownership:** Consolidated API contract metadata, explicit error codes, and logging/error surfaces needed for release hardening.

**Files:**
- Modify: `apps/api/src/api-contract.ts`
- Modify: `apps/api/src/api-contract.test.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/creation/creation-errors.ts`
- Modify: `apps/api/src/content/content-errors.ts`
- Modify: `apps/api/src/runtime/runtime-errors.ts`
- Modify: `apps/web/src/api-client.ts`
- Modify: `apps/web/src/api-client.test.ts`

**Steps:**
1. Write failing tests for a single exported contract list covering creation, review, runtime, and content routes.
2. Normalize error codes so API responses are explicit and reusable by the UI.
3. Add contract helpers for surface-specific route discovery.
4. Keep the error model additive and visible.
5. Run `pnpm --filter @jubensha/api test -- api-contract` and `pnpm --filter @jubensha/web test -- api-client`.

**Acceptance:** API routes and error codes are coherent enough to support a clean product split.

---

## Integration Order

1. Merge Agent A first to expose the asset delivery surface.
2. Merge Agent B to harden release governance.
3. Merge Agent D so API contracts and error codes stay aligned.
4. Merge Agent C after the contract and route boundary work is stable.
5. Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.

---

## Non-Goals

- No real image generation provider integration.
- No multiplayer rewrite.
- No admin moderation workflow beyond read-only review surfaces.
- No silent fallback or mock success paths.

---

## Final Verification

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected:
- Theme asset requests are exposed deterministically.
- Publish review reports explicit diagnostics and golden regression mismatches.
- Product surfaces are split cleanly in the web shell.
- API contracts and errors remain explicit and stable.
