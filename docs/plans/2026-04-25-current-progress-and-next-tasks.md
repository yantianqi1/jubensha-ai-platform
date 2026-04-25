# Current Progress And Next Tasks

> **For Claude:** Use this document as the working snapshot before starting the next implementation batch.

**Snapshot Date:** 2026-04-25

## Current State

The project has moved from demo-grade into a usable alpha slice. The current local product supports:
- API on `http://127.0.0.1:3001` and static web on `http://127.0.0.1:5173` when started locally.
- Product surfaces for `studio-web`, `play-web`, and `admin-web`.
- Studio generation, retry/diff display, StoryBible draft compilation, and Admin package-id handoff.
- Admin publish review, blocker display, golden regression display, asset job inspection, explicit asset job execution, and explicit semver publish action.
- Runtime rooms, deterministic seats, seat join, public/seat/admin snapshots, revision-aware actions, replay, and Postgres-backed room state.
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
- Web API client gained `publishDraft`, `createRuntimeRoom`, `applyRoomAction`, and asset job run helpers.
- Play gained browser workflows for room creation, seat join, scoped snapshot reads, and revision-aware action submission.
- API contract metadata now includes publish review, theme asset compile, demo, NPC ask, and asset job run routes.
- Release checklist now includes a Usable Alpha end-to-end smoke section.

## Remaining Gaps For Next Stage

### Asset Pipeline
- Asset jobs can now run explicitly, but the default provider is still unconfigured.
- A real image/asset provider must be wired in before the pipeline can produce useful generated assets.
- Admin can inspect provider failures and generated references, but the provider itself still needs integration.

### Live Runtime
- Runtime snapshots and revision checks are stable enough for live transport planning.
- No SSE/WebSocket transport exists yet.
- Play UI still requires manual snapshot refresh and does not show live event delivery.

### Play Product Loop
- Play can create/join/read/act, but turn/phase progression is still low-level.
- The UI does not yet guide players through “join -> private briefing -> investigate -> act -> refresh”.
- Runtime action UX needs clearer conflict recovery and current-revision refresh.

### Governance And Accounts
- No authentication, operator/player identity boundary, or admin role model exists.
- Admin actions are explicit but not protected by auth/RBAC yet.
- Audit logs exist as runtime events/request logs, but not as a product-level admin audit trail.

## Suggested Next Tasks

1. Configure a real image provider behind `ThemeAssetProvider` once credentials and provider choice are agreed.
2. Add transport-neutral runtime event stream shape, then SSE as the first live delivery path.
3. Upgrade Play UI into a guided player loop using scoped snapshots and revision refresh.
4. Add minimal operator/player identity boundaries before broader sharing.
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
