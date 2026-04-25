# Current Progress And Next Tasks

> **For Claude:** Use this document as the working snapshot before starting the next implementation batch.

**Snapshot Date:** 2026-04-25

## Current State

The project has moved from demo-grade into a usable alpha slice. The current local product supports:
- API on `http://127.0.0.1:3001` and static web on `http://127.0.0.1:5173` when started locally.
- Product surfaces for `studio-web`, `play-web`, and `admin-web`.
- Studio generation, retry/diff display, StoryBible draft compilation, and Admin package-id handoff.
- Admin publish review, blocker display, golden regression display, asset job inspection, explicit asset job execution, and explicit semver publish action.
- Generation jobs now have durable records, explicit run/read endpoints, and event projection for Studio inspection.
- Runtime rooms, deterministic seats, seat join, public/seat/admin snapshots, revision-aware actions, replay, and Postgres-backed room state.
- Runtime event envelopes and SSE route metadata exist for cursor-based reconnect reads.
- Web Play controls for room creation, seat join, public snapshot, seat-private snapshot, and revision-aware action submission.
- API contract metadata, request logging, CI workflow, and release checklist with Usable Alpha smoke checks.

## Verified Recently

- `pnpm test` passed.
- `pnpm typecheck` passed.
- `pnpm build` passed.
- API contract tests passed after route metadata was aligned with browser-used paths.
- Web tests passed after Admin publish, asset execution, and Play runtime controls were added.

## Implementation Update - Usable Alpha

Completed in the latest implementation batch:
- Admin gained an explicit publish action with semver input and structured publish result/error display.
- Asset jobs gained explicit run support, running/completed/failed states, and an unconfigured provider that fails explicitly instead of pretending success.
- Asset jobs can use an OpenAI-compatible image provider when `THEME_ASSET_PROVIDER=openai-compatible` is configured.
- Publish, asset execution, seat join, and runtime action mutations now require explicit operator/player identity headers.
- Request logs include explicit operator/player ids when supplied, preparing the audit trail foundation.
- Audit events now persist production-critical actions and expose target-scoped reads through `/audit/events`.
- Web API client gained `publishDraft`, `createRuntimeRoom`, `applyRoomAction`, and asset job run helpers.
- Play gained browser workflows for room creation, seat join, scoped snapshot reads, and revision-aware action submission.
- API contract metadata now includes publish review, theme asset compile, demo, NPC ask, and asset job run routes.
- Release checklist now includes a Usable Alpha end-to-end smoke section.

## Remaining Gaps For Next Stage

### Asset Pipeline
- Asset jobs can now run explicitly and call a configured OpenAI-compatible image endpoint.
- The default provider remains explicitly unconfigured until environment variables are set.
- Admin can inspect provider failures and generated references; generated asset persistence is still in-memory job state.

### Live Runtime
- Runtime snapshots and revision checks are stable enough for live transport planning.
- Initial runtime SSE event projection exists, with cursor filtering over room event history.
- Play UI still requires manual snapshot refresh and does not consume live event delivery yet.

### Play Product Loop
- Play can create/join/read/act, but turn/phase progression is still low-level.
- The UI does not yet guide players through “join -> private briefing -> investigate -> act -> refresh”.
- Runtime action UX needs clearer conflict recovery and current-revision refresh.

### Governance And Accounts
- A minimal beta identity boundary exists through explicit `x-operator-id` and `x-player-id` headers.
- This is not full authentication/RBAC; signed sessions and admin role management remain future work.
- Product-level audit records exist for publish attempts, asset job execution, seat join, and runtime actions.

## Suggested Next Tasks

1. Persist asset job records and generated references beyond the in-memory job store.
2. Upgrade Play UI to consume runtime SSE events and recover from stale revisions automatically.
3. Extend audit coverage to NPC generation and generation job execution, then add Admin audit inspection UI.
4. Replace beta identity headers with signed sessions or a deliberate auth provider.
5. Keep running `pnpm test`, `pnpm typecheck`, and `pnpm build` after each batch.

## Working Files To Watch

- `apps/api/src/creation/theme-asset-job.ts`
- `apps/api/src/creation/theme-asset-job.controller.ts`
- `apps/api/src/creation/theme-asset-provider.ts`
- `apps/api/src/runtime/runtime-service.ts`
- `apps/api/src/runtime/runtime.controller.ts`
- `apps/web/src/play-browser-workflow.ts`
- `apps/web/src/admin-browser-workflow.ts`
- `apps/web/src/template.ts`
- `apps/web/src/api-client.ts`
- `apps/api/src/api-contract.ts`
