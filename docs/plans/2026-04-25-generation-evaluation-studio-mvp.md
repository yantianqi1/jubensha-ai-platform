# Generation Evaluation Studio MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan with parallel workers, then use superpowers:verification-before-completion before claiming done.

**Goal:** Build the next product slice after manual StoryBible compilation: planner/critic orchestration, deeper automatic evaluation, and a minimal Studio workflow for generate/retry/diff.

**Architecture:** Keep creation-time AI orchestration separate from runtime NPC interrogation. `apps/api/src/creation` owns planner, critic, retry orchestration, and compile results. `packages/dsl` owns deterministic validators and simulation diagnostics. `apps/web` owns the minimal Studio UI and only calls explicit creation APIs. No silent fallback: deterministic demo providers must be named as test/demo providers, and production model errors must surface.

**Tech Stack:** TypeScript, NestJS, Zod, Vitest, existing `ModelProvider` interface, existing `StoryBible` and `ScriptPackage` DSL, static `apps/web`.

---

## Current Baseline

Already implemented:
- `packages/dsl/src/story-bible-schema.ts` defines the creation-time `StoryBible` contract.
- `packages/dsl/src/story-bible-validation.ts` validates basic StoryBible references.
- `packages/dsl/src/package-flow-diagnostics.ts` reports initial static flow diagnostics.
- `apps/api/src/creation/story-bible-to-script-compiler.ts` compiles `StoryBible` into a draft `ScriptPackage`.
- `apps/api/src/creation/creation-service.ts` creates drafts and returns flow diagnostics.
- `apps/web/src/template.ts` exposes a JSON-based StoryBible compile panel.

This plan starts from that baseline and should not rewrite it.

---

## Parallel Subagent Plan

### Agent A: Planner And Critic Contracts

**Write scope:** `apps/api/src/creation/**`

**Ownership:** Creation-time model contracts, prompt builders, response parsers, deterministic demo provider.

**Files:**
- Create: `apps/api/src/creation/story-planner-agent.ts`
- Create: `apps/api/src/creation/story-planner-agent.test.ts`
- Create: `apps/api/src/creation/story-critic-agent.ts`
- Create: `apps/api/src/creation/story-critic-agent.test.ts`
- Create: `apps/api/src/creation/creation-model-provider.ts`
- Modify: `apps/api/src/creation/creation-service.ts`

**Steps:**
1. Write a failing test for `StoryPlannerAgent.planStoryBible(input)` calling an injected provider with JSON mode.
2. Implement `StoryPlannerAgent` using existing model-provider style, but do not reuse runtime NPC prompts.
3. Write a failing parser test that rejects non-StoryBible planner output with explicit validation error.
4. Implement planner response parsing with `parseStoryBible`; do not repair malformed JSON.
5. Write a failing test for `StoryCriticAgent.reviewStoryBible(storyBible)` returning diagnostics.
6. Implement critic response parser with a small explicit `CriticDiagnosticSchema`.
7. Add `CreationModelProvider` interface so tests can use deterministic providers.
8. Run `pnpm --filter @jubensha/api test -- creation`.

**Acceptance:** Planner can produce a parsed `StoryBible`; critic can return explicit diagnostics; invalid provider output fails loudly.

---

### Agent B: Retry And Review Orchestration

**Write scope:** `apps/api/src/creation/**`

**Ownership:** Creation workflow orchestration and HTTP API for generate/retry.

**Files:**
- Create: `apps/api/src/creation/creation-orchestrator.ts`
- Create: `apps/api/src/creation/creation-orchestrator.test.ts`
- Modify: `apps/api/src/creation/creation.controller.ts`
- Modify: `apps/api/src/creation/creation.controller.test.ts`
- Modify: `apps/api/src/creation/creation.module.ts`

**Steps:**
1. Write a failing orchestrator test for `generateStoryBible(request)` returning `{ storyBible, criticDiagnostics, attempts }`.
2. Implement a strict single-attempt path first: planner output, StoryBible reference validation, critic diagnostics.
3. Write a failing test for explicit retry when critic diagnostics include blocking severity.
4. Implement bounded retry through an injected config object with `maxAttempts`; default is explicit in module config, not hidden fallback.
5. Write controller route metadata test for `POST /creation/story-bibles/generate`.
6. Implement route body parsing for structured prompt fields: `genre`, `playerCount`, `durationMinutes`, `difficulty`, `premise`, `tone`.
7. Return all attempts with diagnostics; do not swallow failed attempts.
8. Run `pnpm --filter @jubensha/api test -- creation`.

**Acceptance:** API can generate a StoryBible through planner/critic orchestration and expose retry attempt history.

---

### Agent C: Simulation Harness And Deeper Diagnostics

**Write scope:** `packages/dsl/**`

**Ownership:** Deterministic static/simulation quality gates for `ScriptPackage`.

**Files:**
- Create: `packages/dsl/src/package-simulation.ts`
- Create: `packages/dsl/src/package-simulation.test.ts`
- Modify: `packages/dsl/src/package-flow-diagnostics.ts`
- Modify: `packages/dsl/src/package-flow-diagnostics.test.ts`
- Modify: `packages/dsl/src/index.ts`

**Steps:**
1. Write failing simulation test for traversing a two-scene compiled package.
2. Implement `simulateScriptPackage(scriptPackage)` using existing runtime helpers where possible.
3. Write failing test for deadlock: no available actions while scene `end_if` is false.
4. Add `deadlock_scene` diagnostic.
5. Write failing test for unreachable scene caused by unsatisfied `entry_if` and no prior action effect.
6. Extend analyzer to include `unreachable_scene` separate from condition-level warning.
7. Write failing test for weak unique-solution support: ending/truth clue references absent from clues.
8. Add `truth_without_clue_support` diagnostic based on StoryBible/compiled clue metadata if available; if metadata is absent, report `not_evaluable` explicitly.
9. Run `pnpm --filter @jubensha/dsl test`.

**Acceptance:** DSL can simulate the compiled package enough to report deadlocks, unreachable scenes, and truth-support gaps without LLM calls.

---

### Agent D: Studio Data Model And API Client

**Write scope:** `apps/web/src/api-client.ts`, `apps/web/src/api-client.test.ts`, new pure view-model files under `apps/web/src/studio-*`

**Ownership:** Web-side typed client and pure Studio state/view-model utilities.

**Files:**
- Modify: `apps/web/src/api-client.ts`
- Modify: `apps/web/src/api-client.test.ts`
- Create: `apps/web/src/studio-view-model.ts`
- Create: `apps/web/src/studio-view-model.test.ts`

**Steps:**
1. Write API client test for `generateStoryBible(request)` calling `/creation/story-bibles/generate`.
2. Add client method and response interfaces.
3. Write pure view-model test for empty Studio form defaults.
4. Implement `createInitialStudioForm()` and `buildGenerateRequest(form)`.
5. Write pure view-model test for displaying attempts, critic diagnostics, flow diagnostics, and diff summaries.
6. Implement formatting helpers without DOM access.
7. Run `pnpm --filter @jubensha/web test`.

**Acceptance:** Web has typed API methods and pure helpers for Studio state before UI wiring.

---

### Agent E: Studio Minimal UI

**Write scope:** `apps/web/src/template.ts`, `apps/web/src/template.test.ts`, `apps/web/src/browser-app.ts`, `apps/web/src/styles.css`

**Ownership:** Minimal Studio UI: topic form, story skeleton editor, relation graph text view, generate/retry/diff panels.

**Files:**
- Modify: `apps/web/src/template.ts`
- Modify: `apps/web/src/template.test.ts`
- Modify: `apps/web/src/browser-app.ts`
- Modify: `apps/web/src/styles.css`

**Steps:**
1. Write template test for Studio form fields: genre, player count, duration, difficulty, premise, tone.
2. Add the form markup next to the current JSON compile panel.
3. Write template test for story skeleton editor, relation graph container, attempts panel, and diff panel.
4. Add the containers with stable `data-*` selectors.
5. Add browser handler for `generate-story-bible` using API client.
6. Add browser handler for `retry-story-bible` using last form and returned attempt history.
7. Render generated StoryBible into the existing JSON textarea for manual compile.
8. Render relation graph as deterministic text edges from `characters[].relations`.
9. Render diff as field-level JSON snippets between previous and latest attempts.
10. Run `pnpm --filter @jubensha/web test && pnpm --filter @jubensha/web typecheck`.

**Acceptance:** A user can fill a structured form, trigger generation, inspect StoryBible skeleton, relations, attempts, diagnostics, and retry output.

---

## Integration Order

1. Merge Agent C first if API wants deeper diagnostics from `@jubensha/dsl`.
2. Merge Agent A before Agent B because orchestration depends on planner/critic contracts.
3. Merge Agent B and update `CreationModule` provider wiring.
4. Merge Agent D before Agent E so UI wiring uses stable client/view-model helpers.
5. Merge Agent E and reconcile selectors/styles.
6. Run full verification: `pnpm test`, `pnpm typecheck`, `pnpm build`.

---

## API Contracts

### `POST /creation/story-bibles/generate`

Request:

```json
{
  "genre": "mystery",
  "playerCount": 4,
  "durationMinutes": 180,
  "difficulty": "medium",
  "premise": "雾港旧账引发失踪案",
  "tone": "阴冷、克制、悬疑"
}
```

Response:

```json
{
  "storyBible": {},
  "criticDiagnostics": [],
  "attempts": [
    {
      "attempt": 1,
      "storyBible": {},
      "criticDiagnostics": [],
      "storyBibleDiagnostics": []
    }
  ]
}
```

### Existing `POST /creation/story-bibles/compile-draft`

Keep existing behavior and extend diagnostics only through additive fields:

```json
{
  "draftPackage": {},
  "flowDiagnostics": [],
  "simulationDiagnostics": []
}
```

---

## Non-Goals For This Phase

- No multiplayer room broadcast.
- No image generation pipeline.
- No admin moderation backend.
- No silent model fallback.
- No direct LLM mutation of runtime room state.
- No large framework migration for `apps/web`.

---

## Final Verification

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected:
- All existing tests pass.
- New API creation tests pass.
- New DSL simulation/diagnostic tests pass.
- Web tests cover stable selectors and client request payloads.

---

## Recommended First Implementation Batch

Start with Agents A, C, and D in parallel. They have disjoint write scopes and unblock B/E. Then run Agents B and E after their dependencies are merged.
