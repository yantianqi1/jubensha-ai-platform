# Story Bible Creation Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development to implement this plan task-by-task.

**Goal:** Build the first creator-side pipeline from structured story bible input to a validated executable draft ScriptPackage.

**Architecture:** Keep creator-time generation separate from runtime NPC interrogation. Add a DSL-level `StoryBible` contract, compile it deterministically into the existing `ScriptPackage` DSL, expose a NestJS creation API, and add a minimal static Web panel for manual compile testing.

**Tech Stack:** TypeScript, Zod, Vitest, NestJS, existing `@jubensha/dsl`, existing static `apps/web` build.

---

## Parallel Work Plan

### Agent A: DSL Story Bible Contract

**Write scope:** `packages/dsl/**`

**Files:**
- Create: `packages/dsl/src/story-bible-schema.ts`
- Create: `packages/dsl/src/story-bible-validation.ts`
- Create: `packages/dsl/src/story-bible-schema.test.ts`
- Create: `packages/dsl/src/story-bible-validation.test.ts`
- Modify: `packages/dsl/src/index.ts`

**Steps:**
1. Write schema tests for a valid story bible and invalid duplicate IDs.
2. Run the targeted DSL test and verify the new tests fail.
3. Implement `StoryBibleSchema`, `StoryBible`, `parseStoryBible`, `safeParseStoryBible`.
4. Write validation tests for missing timeline actors, relation targets, and clue source characters.
5. Implement `validateStoryBibleReferences` diagnostics.
6. Export the new modules from `packages/dsl/src/index.ts`.
7. Run `pnpm --filter @jubensha/dsl test`.

### Agent B: API Creation Pipeline

**Write scope:** `apps/api/src/creation/**`, `apps/api/src/app.module.ts`

**Files:**
- Create: `apps/api/src/creation/story-bible-to-script-compiler.ts`
- Create: `apps/api/src/creation/creation-service.ts`
- Create: `apps/api/src/creation/creation.controller.ts`
- Create: `apps/api/src/creation/creation.module.ts`
- Create: `apps/api/src/creation/story-bible-to-script-compiler.test.ts`
- Create: `apps/api/src/creation/creation-service.test.ts`
- Modify: `apps/api/src/app.module.ts`

**Steps:**
1. Write compiler test for converting a valid story bible into a draft `ScriptPackage`.
2. Implement minimal deterministic compiler outputting roles, clues, intro scene, and investigation scene/action.
3. Write service test that parses and validates story bible input before compiling.
4. Implement `CreationService.compileDraftPackage`.
5. Write controller test for `POST /creation/story-bibles/compile-draft`.
6. Implement `CreationController` and `CreationModule`.
7. Register `CreationModule` in `AppModule`.
8. Run `pnpm --filter @jubensha/api test`.

### Agent C: Web Creator Panel

**Write scope:** `apps/web/**`

**Files:**
- Modify: `apps/web/src/api-client.ts`
- Modify: `apps/web/src/api-client.test.ts`
- Modify: `apps/web/src/template.ts`
- Modify: `apps/web/src/template.test.ts`
- Modify: `apps/web/src/browser-app.ts`
- Modify: `apps/web/src/styles.css`

**Steps:**
1. Write API client test for `compileStoryBibleDraft` URL and request body.
2. Add `compileStoryBibleDraft` to the API client.
3. Write template test for creator panel elements.
4. Add JSON textarea, compile button, and result panel to the template.
5. Add browser event binding that parses JSON and shows explicit errors.
6. Run `pnpm --filter @jubensha/web test`.

## Integration Plan

1. Merge Agent A first because API depends on DSL exports.
2. Merge Agent B and update imports if the DSL names differ.
3. Merge Agent C and ensure the client points to `/creation/story-bibles/compile-draft`.
4. Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
5. Fix only failures caused by this implementation.

## Acceptance Criteria

- A valid `StoryBible` parses through `@jubensha/dsl`.
- Missing story bible references produce explicit diagnostics.
- The API compiles a `StoryBible` into a draft `ScriptPackage` without model calls.
- The compiled package passes existing package parsing and reference validation.
- The Web demo exposes a manual creator panel and surfaces parse/API errors visibly.
