# Visibility Shadow Log MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the W9-W10 validation slice for 5-level visibility and shadow proposal validation before any LLM proposal can affect authoritative runtime state.

**Architecture:** Keep visibility checks in `@jubensha/dsl` as pure reusable functions over `ScopeRef`. Keep shadow validation in `@jubensha/api` as a service that inspects `NpcResponse.proposals` against script content, room state, and the NPC scope, returning auditable data instead of mutating state. Generation returns `speech`, original proposals, and `shadowValidation` results while leaving runtime state unchanged.

**Tech Stack:** TypeScript, Zod, NestJS, Vitest, pnpm.

---

## Implementation Status

Implemented and verified in the current working tree before commit.

- `packages/dsl/src/visibility.ts` adds pure visibility helpers for `ScopeRef` access checks.
- `apps/api/src/shadow/shadow-validation.ts` validates NPC proposals against clue visibility, flag availability, and role existence.
- `apps/api/src/generation/generation-service.ts` now returns `shadowValidation` alongside parsed NPC responses.
- Focused tests for `packages/dsl`, `apps/api/src/shadow`, and `apps/api/src/generation` pass, and the existing repo-wide checks remain green.

## Current Baseline

As of 2026-04-24, commit `c0d80a9` implements foundation runtime, content publishing, runtime rooms, and the first single-Agent NPC boundary.

- `@jubensha/dsl` has Scene DSL schema, runtime evaluation, package schema, and reference validation.
- `@jubensha/api` has content/runtime modules and generation module with prompt building, provider parsing, and HTTP route.
- Generation currently parses model output but does not validate proposal visibility before returning it.

## Task 1: Add DSL Visibility Helpers

**Files:**
- Create: `packages/dsl/src/visibility.ts`
- Create: `packages/dsl/src/visibility.test.ts`
- Modify: `packages/dsl/src/index.ts`

**Steps:**
1. Write tests for public, exact role, exact seat, exact group, system access, and denied mismatches.
2. Run `pnpm --filter @jubensha/dsl test -- src/visibility.test.ts` and confirm it fails because helpers do not exist.
3. Implement `canAccessScope(scope, requester)` and `canAccessAnyScope(scopes, requester)`.
4. Export helpers from `packages/dsl/src/index.ts`.
5. Re-run the focused DSL visibility test.

## Task 2: Add Shadow Proposal Validator

**Files:**
- Create: `apps/api/src/shadow/shadow-validation.ts`
- Create: `apps/api/src/shadow/shadow-validation.test.ts`
- Modify: `apps/api/src/index.ts`

**Steps:**
1. Write tests for accepted empty proposals, accepted visible clue reveal, rejected unknown clue, rejected role-private clue for another NPC, rejected unknown flag, and rejected unknown NPC event role.
2. Run `pnpm --filter @jubensha/api test -- src/shadow/shadow-validation.test.ts` and confirm it fails because validator does not exist.
3. Implement `validateNpcProposals(input)` returning stable auditable results.
4. Export shadow validation types and function from `apps/api/src/index.ts`.
5. Re-run focused shadow validation tests.

## Task 3: Attach Shadow Validation To Generation

**Files:**
- Modify: `apps/api/src/generation/generation-service.ts`
- Modify: `apps/api/src/generation/generation-service.test.ts`
- Modify: `apps/api/src/generation/generation-http.test.ts`

**Steps:**
1. Update service tests to expect `shadowValidation` on returned generation output and prove proposals do not mutate runtime state.
2. Run `pnpm --filter @jubensha/api test -- src/generation/generation-service.test.ts` and confirm it fails.
3. Update `GenerationService.askNpc` to validate parsed proposals with `validateNpcProposals`.
4. Update HTTP tests to expect `speech`, `proposals`, and `shadowValidation`.
5. Re-run generation focused tests.

## Task 4: Verification And Progress Update

**Files:**
- Modify: `docs/plans/2026-04-24-single-agent-npc-mvp.md`
- Modify: `docs/plans/2026-04-24-visibility-shadow-log-mvp.md`

**Steps:**
1. Run `pnpm --filter @jubensha/dsl test -- src/visibility.test.ts`.
2. Run `pnpm --filter @jubensha/api test -- src/shadow src/generation`.
3. Run `pnpm test`.
4. Run `pnpm --filter @jubensha/dsl typecheck` and `pnpm --filter @jubensha/api typecheck`.
5. Run `pnpm build`.
6. Update implementation status in this plan and the previous NPC plan.
7. Inspect `git status --short` and commit the completed work.
