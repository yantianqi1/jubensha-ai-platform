# Script Package Flow Diagnostics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the first automatic quality gate after StoryBible compilation by surfacing static flow diagnostics for generated draft packages.

**Architecture:** Keep diagnostics deterministic and rule-based. Add a DSL-level analyzer for `ScriptPackage` flow issues, call it from the creation service after compilation, and return the diagnostics to the Web creator panel without blocking valid draft creation.

**Tech Stack:** TypeScript, Zod-derived DSL types, Vitest, NestJS, existing static Web app.

---

### Task 1: DSL Flow Diagnostics

**Files:**
- Create: `packages/dsl/src/package-flow-diagnostics.ts`
- Create: `packages/dsl/src/package-flow-diagnostics.test.ts`
- Modify: `packages/dsl/src/index.ts`

**Steps:**
1. Write failing tests for valid linear scenes and unreachable scene entry conditions.
2. Implement a deterministic flow analyzer that simulates scenes in array order.
3. Report explicit diagnostics for scene entry conditions that cannot be satisfied.
4. Export the analyzer from `@jubensha/dsl`.
5. Run `pnpm --filter @jubensha/dsl test`.

### Task 2: API Diagnostic Response

**Files:**
- Modify: `apps/api/src/creation/creation-service.ts`
- Modify: `apps/api/src/creation/creation-service.test.ts`
- Modify: `apps/api/src/creation/creation.controller.test.ts`

**Steps:**
1. Write failing service test expecting `flowDiagnostics` in the compile result.
2. Call the DSL analyzer after compiling the story bible.
3. Persist the draft as before and return `{ draftPackage, flowDiagnostics }`.
4. Keep StoryBible reference errors blocking and explicit.
5. Run `pnpm --filter @jubensha/api test`.

### Task 3: Web Diagnostic Display

**Files:**
- Modify: `apps/web/src/browser-app.ts`
- Modify: `apps/web/src/template.ts`
- Modify: `apps/web/src/template.test.ts`

**Steps:**
1. Add a dedicated diagnostics element to the creator panel.
2. Render diagnostic count and JSON result after compile.
3. Keep JSON parse/API errors explicit in the output panel.
4. Run `pnpm --filter @jubensha/web test`.

### Task 4: Verification

**Commands:**
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

**Acceptance Criteria:**
- Valid generated packages report no flow diagnostics.
- Unreachable scenes produce clear diagnostics with path and message.
- Compile endpoint still creates a draft and now returns diagnostics.
- Web creator panel displays diagnostic status without hiding errors.
