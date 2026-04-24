# Foundation MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the current W1-W4 foundation gap by making the DSL package build cleanly and adding the first executable Scene DSL evaluator.

**Architecture:** Keep `@jubensha/dsl` as the canonical package for schema, parsing, and deterministic rule evaluation. The evaluator accepts immutable runtime state plus a scene/action definition, then returns explicit evaluation results without mutating inputs or hiding invalid rules.

**Tech Stack:** TypeScript, Zod, Vitest, Turbo, pnpm.

---

## Current Status

As of 2026-04-24, the foundation MVP is implemented and locally startable:

- `@jubensha/dsl` covers Scene DSL schema, runtime condition/action/effect evaluation, ScriptPackage schema, and package reference validation.
- `@jubensha/api` covers content draft/version CRUD, package listing, validation, publishing, immutable released versions, NestJS HTTP entrypoints, and PostgreSQL-backed content persistence.
- Runtime starts rooms from released versions, stores authoritative state, applies Scene DSL actions, records/replays action events, exposes REST entrypoints, and persists room state/event history through PostgreSQL.
- In-memory repositories remain for fast unit and HTTP boundary tests; PostgreSQL repositories use `pg`, parameterized SQL, and JSONB snapshots.
- `AppModule`, `main.ts`, `/health`, `/`, and `POST /demo/fog-harbor` make the API startable and browser-inspectable.
- Database schema is explicit through `pnpm --filter @jubensha/api db:schema`; runtime/content code does not silently auto-create tables.
- Root database scripts now use a fixed Compose project name, so `pnpm db:up`, `pnpm db:down`, and `pnpm db:logs` work from the current path.

Verified state:

- `pnpm test` and `pnpm --filter @jubensha/api test -- src/app-http.test.ts` pass
- `pnpm --filter @jubensha/api test -- src/content/content-service.test.ts src/content/content-http.test.ts` passes
- `pnpm --filter @jubensha/api test -- src/runtime/runtime-http.test.ts src/runtime/runtime-service.test.ts` passes
- `pnpm --filter @jubensha/dsl typecheck` and `pnpm --filter @jubensha/api typecheck` pass
- `DATABASE_URL="postgresql://jubensha:jubensha_dev@localhost:5433/jubensha?schema=public" pnpm --filter @jubensha/api db:schema` passes against Docker PostgreSQL
- `DATABASE_URL="postgresql://jubensha:jubensha_dev@localhost:5433/jubensha?schema=public" pnpm --filter @jubensha/api test -- src/runtime/postgres-runtime-repository.test.ts src/content/postgres-content-repository.test.ts` passes against Docker PostgreSQL with 42 tests passing
- `pnpm build` passes
- Local smoke checks pass for `GET /`, `GET /health`, `GET /content/packages`, `GET /runtime/rooms`, `POST /runtime/rooms/:roomId/replay`, and `POST /demo/fog-harbor`

Environment notes: default `pnpm test` does not require a running database; PostgreSQL integration tests are skipped unless `DATABASE_URL` or `TEST_DATABASE_URL` is set. Docker PostgreSQL is defined in `docker-compose.yml` on local port `5433`. `ContentModule` requires `DATABASE_URL` for production persistence and fails explicitly when it is missing.

Local MVP start:

- `pnpm db:up`
- `DATABASE_URL="postgresql://jubensha:jubensha_dev@localhost:5433/jubensha?schema=public" pnpm --filter @jubensha/api db:schema`
- `DATABASE_URL="postgresql://jubensha:jubensha_dev@localhost:5433/jubensha?schema=public" API_PORT=3001 pnpm --filter @jubensha/api dev`
- Open `http://127.0.0.1:3001`

### Task 1: Restore Build And Typecheck

**Files:**
- Modify: `packages/dsl/tsconfig.json`
- Create: `packages/dsl/tsconfig.build.json`
- Modify: `packages/dsl/package.json`

**Step 1: Verify current failure**

Run: `pnpm --filter @jubensha/dsl typecheck`
Expected: FAIL with TS6059 because `scripts/export-json-schema.ts` is outside `rootDir`.

**Step 2: Split build and typecheck configs**

Use `tsconfig.json` for full package typechecking with `rootDir: "."`.
Use `tsconfig.build.json` for library emit from `src/**/*` only.

**Step 3: Point build script at build config**

Change package build script to `tsc -p tsconfig.build.json`.

**Step 4: Verify**

Run:
- `pnpm --filter @jubensha/dsl typecheck`
- `pnpm build`

Expected: both pass.

### Task 2: Add Scene Condition Evaluator

**Files:**
- Create: `packages/dsl/src/runtime.ts`
- Create: `packages/dsl/src/runtime.test.ts`
- Modify: `packages/dsl/src/index.ts`

**Step 1: Write failing tests**

Add tests for:
- `flag_true` and `flag_false`
- `inventory_has`
- `clue_revealed`
- `all_clues_revealed`
- `timer_expired`
- `phase_eq`
- `counter_gte`
- `seat_count_gte`

Run: `pnpm --filter @jubensha/dsl test -- src/runtime.test.ts`
Expected: FAIL because `evaluateCondition` is not exported.

**Step 2: Implement minimal evaluator**

Create immutable runtime state types and pure functions:
- `evaluateCondition(condition, state)`
- `evaluateConditions(conditions, state)`

Do not add fallback behavior. Unknown operators should be impossible through TypeScript/Zod and should not be silently accepted.

**Step 3: Verify**

Run: `pnpm --filter @jubensha/dsl test -- src/runtime.test.ts`
Expected: PASS.

### Task 3: Add Action Availability Evaluator

**Files:**
- Modify: `packages/dsl/src/runtime.ts`
- Modify: `packages/dsl/src/runtime.test.ts`

**Step 1: Write failing tests**

Add tests for:
- action with no guards is available
- action with passing guards is available
- action with failing guards is unavailable
- scene action lookup fails explicitly for missing action codes

Run: `pnpm --filter @jubensha/dsl test -- src/runtime.test.ts`
Expected: FAIL because action helpers do not exist.

**Step 2: Implement minimal action helpers**

Add:
- `isActionAvailable(action, state)`
- `findSceneAction(scene, actionCode)`
- `getAvailableActions(scene, state)`

Missing action lookup must throw an explicit error.

**Step 3: Verify**

Run: `pnpm --filter @jubensha/dsl test -- src/runtime.test.ts`
Expected: PASS.

### Task 4: Full Verification

**Files:**
- No new files unless verification exposes a real issue.

**Step 1: Run checks**

Run:
- `pnpm test`
- `pnpm --filter @jubensha/dsl typecheck`
- `pnpm build`

Expected: all pass.

**Step 2: Inspect git state**

Run: `git status --short`
Expected: only intended plan and DSL files changed.

### Task 5: Add Effect Application

**Files:**
- Modify: `packages/dsl/src/runtime.ts`
- Modify: `packages/dsl/src/runtime.test.ts`

**Step 1: Write failing tests**

Add tests for:
- `reveal_clue` adds a clue once
- `set_flag` returns a new flag map
- `grant_item` adds an item once
- `advance_phase` changes phase
- `npc_event` appends an auditable NPC event
- `score_delta` updates an explicit score bucket
- `broadcast_message` appends an auditable message

Run: `pnpm --filter @jubensha/dsl test -- src/runtime.test.ts`
Expected: FAIL because `applyEffect` and `applyEffects` do not exist.

**Step 2: Implement minimal immutable updates**

Add:
- `applyEffect(effect, state)`
- `applyEffects(effects, state)`

All updates return a new `RuntimeState`. Do not mutate arrays, records, or input state.

### Task 6: Add Action Execution

**Files:**
- Modify: `packages/dsl/src/runtime.ts`
- Modify: `packages/dsl/src/runtime.test.ts`

**Step 1: Write failing tests**

Add tests for:
- available action applies its effects
- unavailable action throws explicit error
- scene action execution fails for unknown action code

Run: `pnpm --filter @jubensha/dsl test -- src/runtime.test.ts`
Expected: FAIL because `applyAction` and `applySceneAction` do not exist.

**Step 2: Implement action execution**

Add:
- `applyAction(action, state)`
- `applySceneAction(scene, actionCode, state)`

Availability must be checked before effects are applied.

### Task 7: Add Script Package Schema

**Files:**
- Create: `packages/dsl/src/package-schema.ts`
- Create: `packages/dsl/src/package-schema.test.ts`
- Modify: `packages/dsl/src/index.ts`

**Step 1: Write failing tests**

Add tests for:
- a minimal package with one role, one clue, and one scene parses
- duplicate role codes are rejected
- duplicate clue codes are rejected
- duplicate scene codes are rejected
- released package metadata requires semantic version text

Run: `pnpm --filter @jubensha/dsl test -- src/package-schema.test.ts`
Expected: FAIL because package schema does not exist.

**Step 2: Implement package schema**

Add:
- `ScriptRoleSchema`
- `ScriptClueSchema`
- `ScriptPackageSchema`
- `parseScriptPackage`
- `safeParseScriptPackage`

Keep the schema content-focused. Do not introduce persistence IDs or database fields here.

### Task 8: Add Script Package Reference Validation

**Files:**
- Create: `packages/dsl/src/package-validation.ts`
- Create: `packages/dsl/src/package-validation.test.ts`
- Modify: `packages/dsl/src/index.ts`

**Step 1: Write failing tests**

Add tests for:
- valid package returns no diagnostics
- `reveal_clue` referencing a missing clue returns an error diagnostic
- `clue_revealed` and `all_clues_revealed` referencing missing clues return diagnostics
- `npc_event` referencing a missing NPC role returns a diagnostic
- duplicate diagnostics are stable and explicit

Run: `pnpm --filter @jubensha/dsl test -- src/package-validation.test.ts`
Expected: FAIL because validation does not exist.

**Step 2: Implement validation**

Add:
- `validateScriptPackageReferences(scriptPackage)`

Return diagnostics as data. Do not throw during cross-reference validation so Studio/API can show all content issues at once.

### Task 9: Add Content Domain Service

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/content/content-service.ts`
- Create: `apps/api/src/content/content-repository.ts`
- Create: `apps/api/src/content/content-errors.ts`
- Create: `apps/api/src/content/in-memory-content-repository.ts`
- Create: `apps/api/src/content/content-service.test.ts`

**Step 1: Write failing tests**

Add tests for:
- creating a draft package stores parsed content
- invalid package content throws a validation error
- package reference diagnostics throw a validation error
- publishing freezes an immutable version
- updating a published version throws an explicit conflict error

Run: `pnpm --filter @jubensha/api test`
Expected: FAIL because API package and content service do not exist.

**Step 2: Implement content domain**

Add:
- `ContentService`
- `ContentRepository`
- `InMemoryContentRepository`
- `ContentValidationError`
- `ContentConflictError`

Do not add database or HTTP concerns in this task. Use dependency injection and avoid global state.
