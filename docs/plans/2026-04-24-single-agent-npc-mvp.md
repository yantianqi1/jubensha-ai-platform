# Single Agent NPC MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the W7-W8 single NPC interrogation slice with deterministic model boundaries, auditable double-channel output, and no mutation of authoritative room state before validation.

**Architecture:** Keep LLM output outside the DSL rule engine until it is parsed and validated. The API owns orchestration through a `GenerationModule`, while model invocation is hidden behind an injected provider interface so tests can use explicit test doubles without production fallbacks. Runtime state remains authoritative in `RuntimeService`; NPC responses create auditable proposal records first, then later phases can route accepted proposals into the Scene DSL engine.

**Tech Stack:** TypeScript, NestJS, Zod, Vitest, pnpm, SSE-ready HTTP boundaries.

---

## Current Baseline

As of 2026-04-24, the foundation work is locally verified:

- `@jubensha/dsl` exposes Scene DSL schema, condition/action/effect runtime evaluation, ScriptPackage parsing, and package reference diagnostics.
- `@jubensha/api` exposes content draft/version CRUD, immutable publish flow, runtime room creation/action/replay, NestJS HTTP controllers, PostgreSQL repositories, and demo startup endpoints.
- `pnpm test` passes with PostgreSQL integration tests skipped unless a database URL is present.
- `pnpm --filter @jubensha/dsl typecheck`, `pnpm --filter @jubensha/api typecheck`, and `pnpm build` pass.

Do not start by changing persistence or model-provider code. First define the stable NPC response contract and service boundary.

## Task 1: Add NPC Response Contract

**Files:**
- Create: `apps/api/src/generation/npc-response-schema.ts`
- Create: `apps/api/src/generation/npc-response-schema.test.ts`
- Modify: `apps/api/src/index.ts`

**Step 1: Write failing schema tests**

Add tests for:
- valid response with `speech` and empty `proposals` parses
- valid response with one `reveal_clue` proposal parses
- missing `speech` is rejected
- unknown proposal type is rejected
- `confidence` outside `0..1` is rejected

Run: `pnpm --filter @jubensha/api test -- src/generation/npc-response-schema.test.ts`

Expected: FAIL because `parseNpcResponse` is not exported.

**Step 2: Implement schema**

Add:
- `NpcProposalSchema`
- `NpcResponseSchema`
- `parseNpcResponse(input)`
- `safeParseNpcResponse(input)`

Use Zod discriminated unions. Keep the first proposal set narrow: `reveal_clue`, `set_flag`, and `npc_event` only.

**Step 3: Export contract**

Export the contract from `apps/api/src/index.ts` so future worker or HTTP code can reuse it.

**Step 4: Verify**

Run: `pnpm --filter @jubensha/api test -- src/generation/npc-response-schema.test.ts`

Expected: PASS.

## Task 2: Add Model Provider Boundary

**Files:**
- Create: `apps/api/src/generation/model-provider.ts`
- Create: `apps/api/src/generation/generation-errors.ts`
- Create: `apps/api/src/generation/model-provider.test.ts`

**Step 1: Write failing provider tests**

Add tests for:
- provider request contains system prompt, user prompt, and JSON mode requirement
- invalid JSON text throws an explicit generation validation error
- syntactically valid but schema-invalid JSON throws an explicit generation validation error

Run: `pnpm --filter @jubensha/api test -- src/generation/model-provider.test.ts`

Expected: FAIL because provider helpers do not exist.

**Step 2: Implement provider interfaces**

Add:
- `ModelProvider` interface with `completeJson(input)`
- `ModelPromptInput` and `ModelCompletionInput` types
- `GenerationValidationError`
- `parseProviderNpcResponse(text)`

Do not add real OpenAI/Claude/LiteLLM HTTP calls in this task. Do not add production fallback output.

**Step 3: Verify**

Run: `pnpm --filter @jubensha/api test -- src/generation/model-provider.test.ts`

Expected: PASS.

## Task 3: Add NPC Prompt Builder

**Files:**
- Create: `apps/api/src/generation/npc-prompt-builder.ts`
- Create: `apps/api/src/generation/npc-prompt-builder.test.ts`

**Step 1: Write failing prompt tests**

Add tests for:
- prompt includes NPC public profile and private secret for that NPC only
- prompt includes current scene code and phase
- prompt includes visible clue summaries only
- prompt excludes private secrets for other roles
- prompt requires an existing NPC role code

Run: `pnpm --filter @jubensha/api test -- src/generation/npc-prompt-builder.test.ts`

Expected: FAIL because `buildNpcPrompt` does not exist.

**Step 2: Implement prompt builder**

Add:
- `buildNpcPrompt(input)`
- `NpcPromptInput` type

Read data from `ScriptPackage` and `RuntimeState`; return immutable prompt parts as data, not a provider call.

**Step 3: Verify**

Run: `pnpm --filter @jubensha/api test -- src/generation/npc-prompt-builder.test.ts`

Expected: PASS.

## Task 4: Add Generation Service

**Files:**
- Create: `apps/api/src/generation/generation-service.ts`
- Create: `apps/api/src/generation/generation-service.test.ts`
- Modify: `apps/api/src/generation/generation-errors.ts`

**Step 1: Write failing service tests**

Add tests for:
- asking an NPC calls the injected provider with built prompt input
- valid provider JSON returns parsed `NpcResponse`
- provider schema failure surfaces as `GenerationValidationError`
- missing room surfaces runtime not-found error from injected runtime reader
- missing released version surfaces content not-found error from injected content reader

Run: `pnpm --filter @jubensha/api test -- src/generation/generation-service.test.ts`

Expected: FAIL because `GenerationService` does not exist.

**Step 2: Implement service**

Add:
- `GenerationService`
- `AskNpcInput`
- injected `RuntimeRoomReader`, `ReleasedVersionReader`, and `ModelProvider`

The service returns parsed response data only. It must not mutate `RuntimeRoomRecord` or append runtime events.

**Step 3: Verify**

Run: `pnpm --filter @jubensha/api test -- src/generation/generation-service.test.ts`

Expected: PASS.

## Task 5: Add HTTP Boundary

**Files:**
- Create: `apps/api/src/generation/generation.controller.ts`
- Create: `apps/api/src/generation/generation.module.ts`
- Create: `apps/api/src/generation/generation.tokens.ts`
- Create: `apps/api/src/generation/generation-http-error.filter.ts`
- Create: `apps/api/src/generation/generation-http.test.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Write failing HTTP tests**

Add tests for:
- `POST /generation/rooms/:roomId/npc/:npcCode/ask` returns `speech` and `proposals`
- invalid request body returns `400`
- generation validation error returns `422`
- unknown room returns `404`

Run: `pnpm --filter @jubensha/api test -- src/generation/generation-http.test.ts`

Expected: FAIL because route is not registered.

**Step 2: Implement controller and module**

Add a JSON HTTP route first. Do not add SSE streaming until the non-streaming contract is stable.

Use dependency injection tokens; do not hard-import concrete repositories inside business logic.

**Step 3: Register module**

Import `GenerationModule` from `AppModule`.

**Step 4: Verify**

Run: `pnpm --filter @jubensha/api test -- src/generation/generation-http.test.ts`

Expected: PASS.

## Task 6: Full Verification

**Files:**
- No new files unless verification exposes a real issue.

**Step 1: Run focused checks**

Run:
- `pnpm --filter @jubensha/api test -- src/generation`
- `pnpm --filter @jubensha/api typecheck`

Expected: all pass.

**Step 2: Run repository checks**

Run:
- `pnpm test`
- `pnpm --filter @jubensha/dsl typecheck`
- `pnpm build`

Expected: all pass.

**Step 3: Inspect git state**

Run: `git status --short`

Expected: only intended generation files, `apps/api/src/app.module.ts`, `apps/api/src/index.ts`, and this plan are changed beyond existing foundation files.

