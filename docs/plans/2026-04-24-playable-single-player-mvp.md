# Playable Single Player MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete W12 by making the first single-player mystery playable from a browser against real local API endpoints.

**Architecture:** Keep backend authority in `@jubensha/api`; the browser never mutates runtime state directly. `apps/web` calls real HTTP endpoints for demo package publication, room creation, NPC interrogation, room refresh, and shadow validation display. A deliberately explicit `MODEL_PROVIDER=scripted-demo` mode enables local playability without silently pretending a production LLM is configured.

**Tech Stack:** TypeScript, NestJS, static browser app, esbuild, Vitest, pnpm.

---

## Implementation Status

Implemented in the current working tree before commit.

- `apps/api/src/generation/scripted-demo-model-provider.ts` adds an explicit scripted provider selected only with `MODEL_PROVIDER=scripted-demo`.
- `apps/api/src/demo/demo-package.ts` now includes playable NPC roles for the fog harbor demo.
- `apps/web/src/api-client.ts` calls real API endpoints for `POST /demo/fog-harbor`, `POST /generation/rooms/:roomId/npc/:npcCode/ask`, and `GET /runtime/rooms/:roomId`.
- `apps/web/src/template.ts` renders browser controls for API base URL, room creation, NPC selection, player message, status, response, and shadow validation.
- `apps/web/src/browser-app.ts` wires the page to the real API flow and updates the investigation UI from server responses.
- `apps/web/scripts/build-static.mjs` bundles the browser entry and emits a self-contained static app in `apps/web/dist`.

## Local Smoke Path

1. Start infrastructure and schema:
   - `pnpm db:up`
   - `DATABASE_URL="postgresql://jubensha:jubensha_dev@localhost:5433/jubensha?schema=public" pnpm --filter @jubensha/api db:schema`
2. Start API with explicit demo model provider:
   - `DATABASE_URL="postgresql://jubensha:jubensha_dev@localhost:5433/jubensha?schema=public" MODEL_PROVIDER=scripted-demo CORS_ORIGINS="http://127.0.0.1:5173" API_PORT=3001 pnpm --filter @jubensha/api dev`
3. Build and serve web:
   - `pnpm --filter @jubensha/web build`
   - `python3 -m http.server 5173 -d apps/web/dist`
4. Open `http://127.0.0.1:5173`.
5. Click `启动雾港 demo`.
6. Keep NPC as `管家`, ask `窗台怎么回事？`, then click `盘问 NPC`.
7. Expected: page shows NPC speech, proposals, and `Shadow 校验通过。`; room state remains server-authoritative.

## Completed Tasks

- Add explicit local demo model provider.
- Connect web to real API endpoints.
- Add browser controls for demo creation and NPC questioning.
- Document smoke path for first playable single-player mystery.
