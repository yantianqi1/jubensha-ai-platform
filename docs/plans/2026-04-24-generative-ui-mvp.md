# Generative UI MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the W11 single-player investigation UI slice: clue board, timeline, and suspect matrix backed by deterministic view-model data.

**Architecture:** Add `@jubensha/web` as a static TypeScript web app in the existing pnpm workspace. Keep UI derivation in pure functions so tests can validate clue visibility, timeline ordering, and suspect evidence links without a browser. Build produces `apps/web/dist/index.html`, `styles.css`, and `app.js`; no backend state mutation or model calls are introduced.

**Tech Stack:** TypeScript, Vitest, pnpm, Turbo, static HTML/CSS/JS.

---

## Implementation Status

Implemented in the current working tree before commit.

- `apps/web` adds the `@jubensha/web` static investigation UI workspace package.
- `apps/web/src/investigation-view-model.ts` derives clue board, timeline, suspect matrix, and active phase data from `ScriptPackage` and `RuntimeState`.
- `apps/web/src/template.ts`, `apps/web/src/main.ts`, and `apps/web/src/styles.css` render a dark editorial investigation desk with line-of-reasoning panels.
- `apps/web/scripts/build-static.mjs` emits `dist/index.html`, `dist/styles.css`, and `dist/app.js` for inspection.

## Current Baseline

- Foundation runtime, content publishing, NPC generation boundary, visibility helpers, and shadow validation are implemented.
- W11 requires the first visible player-facing UI artifact for line-of-reasoning work.
- This MVP uses a local demo view-model first; API fetch can be added once the UX is stable.

## Task 1: Add Investigation View Model

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/investigation-view-model.ts`
- Create: `apps/web/src/investigation-view-model.test.ts`

**Steps:**
1. Write tests for clue board visibility, timeline ordering, suspect evidence counts, and active phase summary.
2. Run `pnpm --filter @jubensha/web test -- src/investigation-view-model.test.ts` and confirm it fails because files/scripts do not exist.
3. Implement pure view-model helpers.
4. Re-run focused web tests.

## Task 2: Add Static UI Shell

**Files:**
- Create: `apps/web/src/main.ts`
- Create: `apps/web/src/styles.css`
- Create: `apps/web/src/template.ts`
- Create: `apps/web/scripts/build-static.mjs`

**Steps:**
1. Write render functions that consume the tested view-model.
2. Add a build script that emits `dist/index.html`, `dist/styles.css`, and `dist/app.js`.
3. Run `pnpm --filter @jubensha/web build`.
4. Verify emitted `dist/index.html` contains clue board, timeline, and suspect matrix sections.

## Task 3: Verify And Update Progress

**Files:**
- Modify: `docs/plans/2026-04-24-generative-ui-mvp.md`

**Steps:**
1. Run `pnpm --filter @jubensha/web test`.
2. Run `pnpm --filter @jubensha/web typecheck`.
3. Run `pnpm test`.
4. Run `pnpm build`.
5. Update implementation status in this plan.
6. Commit the completed work.
