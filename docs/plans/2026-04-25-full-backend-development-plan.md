# Full Backend Development Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan in parallel batches, then use superpowers:verification-before-completion before claiming done.

**Goal:** Complete the backend from the current usable alpha into a production-ready murder mystery creation, publishing, play, and operations platform.

**Architecture:** Keep deterministic domain contracts in `packages/dsl`, creator/review/provider orchestration in `apps/api/src/creation`, versioned content and publishing in `apps/api/src/content`, authoritative room state in `apps/api/src/runtime`, model calls in provider adapters, and cross-cutting production concerns in explicit modules such as identity, audit, billing, moderation, and observability. No backend path may fake provider success, silently downgrade failures, bypass publish gates, or let clients mutate authoritative runtime state directly.

**Tech Stack:** TypeScript, NestJS, Zod, Vitest, pnpm/turbo, PostgreSQL, Redis when needed for live/session/cache queues, HTTP/SSE first, OpenAI-compatible provider adapters, deterministic DSL contracts.

---

## Current Backend Baseline

Already implemented locally:
- `packages/dsl`: scene/package schema, StoryBible schema, theme token schema, validation, flow diagnostics, simulation.
- `apps/api/src/creation`: StoryBible planner/critic, retry feedback loop, StoryBible compiler, quality gate, publish review, review workbench, theme asset manifests, explicit asset jobs.
- `apps/api/src/content`: draft package persistence, release versions, publish gate, content HTTP errors.
- `apps/api/src/runtime`: runtime rooms, seats, scoped snapshots, revision-aware actions, replay, Postgres-backed room state.
- `apps/api/src/generation`: OpenAI-compatible NPC provider, prompt builder, NPC response schema, shadow validation integration.
- Cross-cutting: API contract metadata, request logging, CI workflow, release checklist.

The backend is now a usable alpha. The remaining work is mostly productionization: real providers, live delivery, identity, audit, moderation, cost controls, database migrations, and operational hardening.

---

## Target Backend Capability

A complete backend must support this full chain:

1. Creator submits structured story constraints.
2. Backend generates StoryBible with planner/critic loop and explicit provider errors.
3. Backend compiles StoryBible into executable `ScriptPackage` DSL.
4. Backend runs deterministic validation, simulation, quality gate, moderation, and asset manifest generation.
5. Operator reviews diagnostics, asset jobs, and publish blockers.
6. Backend executes real asset jobs through configured providers.
7. Backend publishes immutable released content versions only when gates pass.
8. Players create/join rooms from released versions.
9. Runtime serves scoped snapshots, authoritative actions, live event streams, replay, and reconnect.
10. NPC generation proposes narrative/runtime changes through shadow validation only.
11. Identity, RBAC, audit logs, cost tracking, and observability cover all production-critical actions.

---

## Stage 1: Backend Beta Hardening

**Goal:** Make the existing alpha safe for controlled internal beta with real provider work and live runtime reads.

**Estimated Effort:** 4-6 person-weeks.

### Agent A: Real Asset Provider Backend

**Write Scope:** `apps/api/src/creation/**`, `apps/api/src/app-config.ts`, `.env.example`

**Responsibilities:**
- Replace the default unconfigured provider with a configurable real provider adapter while keeping unconfigured failure explicit.
- Support provider request/result metadata for cover, character portrait, clue image, and theme assets.
- Persist job lifecycle transitions: `queued`, `running`, `completed`, `failed`.

**Tasks:**
1. Write failing tests for configured and unconfigured provider paths.
2. Add provider config validation from environment.
3. Add `ThemeAssetProvider` implementation for the chosen image endpoint.
4. Store generated asset references and provider metadata on completed jobs.
5. Preserve provider error code/message on failed jobs.
6. Add idempotent job execution guard that rejects rerunning completed jobs explicitly.
7. Update `.env.example` with provider variables and no secrets.

**Acceptance:** Asset jobs create real provider calls only when configured, and failed provider calls are inspectable by operators.

### Agent B: Runtime SSE Backend

**Write Scope:** `apps/api/src/runtime/**`, `apps/api/src/api-contract.ts`

**Responsibilities:**
- Add transport-neutral runtime event envelopes.
- Expose SSE stream as first live delivery path.
- Support reconnect from snapshot + event cursor.

**Tasks:**
1. Write failing tests for monotonic event ids and event filtering by room.
2. Add runtime event envelope schema with `eventId`, `roomId`, `revision`, `type`, `scope`, and `payload`.
3. Project existing room event history into streamable events.
4. Add `GET /runtime/rooms/:roomId/events` SSE endpoint with explicit `afterEventId` support.
5. Keep scoped payload trimming server-side.
6. Add API contract metadata for the stream route.

**Acceptance:** A client can reconnect with a cursor and receive only authorized, ordered runtime events.

### Agent C: Minimal Backend Identity Boundary

**Write Scope:** `apps/api/src/identity/**`, `apps/api/src/creation/**`, `apps/api/src/runtime/**`, `apps/api/src/content/**`

**Responsibilities:**
- Add a minimal identity layer before broader sharing.
- Separate operator actions from player actions.
- Avoid implementing a full SaaS account model in this stage.

**Tasks:**
1. Define `RequestActor` with `actorId`, `actorType`, and `roles`.
2. Add request actor extraction from explicit development headers or signed token, depending on deployment choice.
3. Require operator role for publish, asset execution, and admin review mutation endpoints.
4. Require player identity for seat join and player action endpoints.
5. Ensure unauthenticated requests fail with structured 401/403 errors.
6. Add tests for forbidden publish/job/runtime actions.

**Acceptance:** Admin mutations and player mutations have explicit backend identity checks.

### Agent D: Audit Trail Foundation

**Write Scope:** `apps/api/src/audit/**`, `apps/api/src/creation/**`, `apps/api/src/content/**`, `apps/api/src/runtime/**`

**Responsibilities:**
- Record production-critical backend actions.
- Make audit records queryable for support/debugging.

**Tasks:**
1. Add `AuditEvent` schema and repository interface.
2. Persist audit records for publish attempts, asset job execution, room creation, seat join, runtime action, and NPC generation.
3. Include actor, target, request id, status, and structured error code.
4. Add read-only admin endpoint for package/room scoped audit events.
5. Add tests for success and failure audit records.

**Acceptance:** Operators can inspect who did what for release and runtime-critical actions.

---

## Stage 2: Creator Pipeline Productionization

**Goal:** Make generated content quality repeatable and reviewable at scale.

**Estimated Effort:** 5-8 person-weeks.

### Agent A: Generation Job Queue

**Write Scope:** `apps/api/src/creation/**`, `apps/api/src/generation/**`, `apps/api/src/app-config.ts`

**Responsibilities:**
- Move long-running creation work behind explicit jobs.
- Keep synchronous endpoints only for small dev/test use.

**Tasks:**
1. Define `CreationJob` states and payloads for StoryBible generation, compile, critic review, simulation, moderation, and asset preparation.
2. Add job repository with Postgres persistence.
3. Add worker executor that runs one job step at a time and surfaces errors.
4. Add job status/read endpoints.
5. Add cancellation for queued/running jobs only when provider supports it or fail explicitly when unsupported.
6. Add tests for failed provider output, invalid model JSON, and retryable/non-retryable job failures.

**Acceptance:** Creator-facing generation no longer depends on one long HTTP request.

### Agent B: Prompt And Model Governance

**Write Scope:** `apps/api/src/creation/**`, `apps/api/src/generation/**`

**Responsibilities:**
- Version prompts, schemas, and model routing.
- Make generated output reproducible enough for debugging.

**Tasks:**
1. Add prompt version metadata for planner, critic, compiler assistance, NPC prompts, and asset prompts.
2. Store provider name, model, prompt version, schema version, and token/cost estimates on generation records.
3. Add model router with explicit route config for planner, critic, NPC, and assets.
4. Add budget controller that rejects jobs when estimated cost exceeds configured limits.
5. Add tests for missing model config, budget rejection, and prompt version propagation.

**Acceptance:** Every model call has traceable version, route, and cost metadata.

### Agent C: Moderation And Policy Gate

**Write Scope:** `apps/api/src/moderation/**`, `apps/api/src/creation/**`, `apps/api/src/content/**`

**Responsibilities:**
- Add explicit content moderation before publish.
- Keep moderation separate from quality scoring.

**Tasks:**
1. Define moderation subject types: story bible, script package, public synopsis, private role secret, clue content, asset prompt, generated asset reference.
2. Add moderation provider interface with unconfigured explicit error.
3. Store moderation diagnostics on package draft/review records.
4. Require moderation pass in publish gate.
5. Add operator-visible moderation blockers.
6. Add tests for policy failure, provider failure, and publish blocking.

**Acceptance:** Content cannot be published without explicit moderation pass or documented operator override if allowed.

### Agent D: Golden Dataset And Evaluation Runs

**Write Scope:** `apps/api/src/creation/**`, `packages/dsl/src/**`, `docs/operations/**`

**Responsibilities:**
- Expand quality regression from one fixture into repeatable evaluation runs.

**Tasks:**
1. Define `GoldenCase` schema for StoryBible + expected package diagnostics + expected simulation result.
2. Add multiple genre/difficulty fixtures.
3. Add evaluation run service and endpoint.
4. Store run summaries and per-case failures.
5. Add release checklist step for evaluation run id.
6. Add tests for deterministic pass/fail summaries.

**Acceptance:** Release review can cite an evaluation run, not just ad-hoc tests.

---

## Stage 3: Runtime Production Backend

**Goal:** Support real play sessions with reconnect, live updates, scoped NPC generation, and operational recovery.

**Estimated Effort:** 6-10 person-weeks.

### Agent A: Room Lifecycle State Machine

**Write Scope:** `apps/api/src/runtime/**`

**Responsibilities:**
- Formalize room lifecycle beyond raw snapshots/actions.

**Tasks:**
1. Define room states: `created`, `seating`, `briefing`, `playing`, `voting`, `revealing`, `ended`, `archived`.
2. Add allowed transition table and tests for invalid transitions.
3. Bind actions to lifecycle states.
4. Add host/operator controls for start, pause, resume, end, archive.
5. Store lifecycle transition events in room history.

**Acceptance:** Runtime room lifecycle is explicit, auditable, and prevents invalid play operations.

### Agent B: Scoped NPC Runtime Integration

**Write Scope:** `apps/api/src/generation/**`, `apps/api/src/runtime/**`, `apps/api/src/shadow/**`

**Responsibilities:**
- Make NPC generation safe for live rooms.

**Tasks:**
1. Require room revision and actor identity on NPC ask.
2. Include scoped snapshot and role-private constraints in NPC prompt context.
3. Validate model proposals through shadow validation before applying runtime changes.
4. Store NPC request/response/proposal/audit records.
5. Add rate limits per room/player/NPC.
6. Add tests for rejected proposals, stale revision, and private information leakage prevention.

**Acceptance:** NPCs can enrich play without bypassing state authority or leaking private knowledge.

### Agent C: Replay And Recovery Backend

**Write Scope:** `apps/api/src/runtime/**`, `apps/api/src/audit/**`

**Responsibilities:**
- Make rooms support debugging, replay, and recovery.

**Tasks:**
1. Add deterministic replay verification from event history.
2. Add replay diff diagnostics when stored snapshot diverges from event replay.
3. Add admin endpoint to inspect room replay report.
4. Add safe recovery action for rebuilding snapshot from event history.
5. Add tests for replay success and intentional divergence.

**Acceptance:** Operators can diagnose and recover corrupt or disputed room states.

### Agent D: Runtime Persistence And Scaling

**Write Scope:** `apps/api/src/runtime/**`, database schema files, `docker-compose.yml`

**Responsibilities:**
- Prepare room storage for concurrent beta usage.

**Tasks:**
1. Add explicit DB indexes for room id, package version, updated time, and event cursor.
2. Add optimistic concurrency at repository level.
3. Add cleanup/archive job for old rooms.
4. Add load-oriented tests around concurrent stale revisions.
5. Add Redis only where needed for SSE fanout or locks, not as hidden source of truth.

**Acceptance:** Room persistence remains authoritative and predictable under concurrent usage.

---

## Stage 4: Content, Account, And Tenant Backend

**Goal:** Move from local/admin-driven alpha to real multi-user product backend.

**Estimated Effort:** 8-14 person-weeks.

### Agent A: Account And Session Model

**Write Scope:** `apps/api/src/identity/**`, `apps/api/src/app.module.ts`, database schema files

**Responsibilities:**
- Replace minimal identity boundary with real accounts and sessions.

**Tasks:**
1. Define users, sessions, roles, organizations/workspaces if needed.
2. Add auth endpoints for login/logout/session introspection using chosen provider or passwordless flow.
3. Add session repository and expiration behavior.
4. Add RBAC guards for creator, operator, admin, player, observer.
5. Add tests for session expiry and role enforcement.

**Acceptance:** Backend can distinguish creators, operators, players, and admins reliably.

### Agent B: Content Catalog And Ownership

**Write Scope:** `apps/api/src/content/**`, `apps/api/src/creation/**`

**Responsibilities:**
- Add package ownership, listing, search, and lifecycle controls.

**Tasks:**
1. Add content owner/workspace metadata to packages.
2. Add list/filter endpoints for drafts and released packages.
3. Add lifecycle states: draft, review, rejected, approved, released, archived.
4. Add package duplication/fork support for creators.
5. Add tests for ownership isolation and role-based access.

**Acceptance:** Creators and operators can manage multiple packages without leaking content across users.

### Agent C: Player Session And Room Access

**Write Scope:** `apps/api/src/runtime/**`, `apps/api/src/identity/**`

**Responsibilities:**
- Connect real users/guests to runtime seats.

**Tasks:**
1. Define room invitation/join code model.
2. Bind seat claims to authenticated or guest player identities.
3. Add reconnect token/session validation.
4. Add host controls for kicking/reassigning seats.
5. Add tests for seat hijack prevention and reconnect.

**Acceptance:** Real users can join rooms without arbitrary seat takeover.

### Agent D: Billing And Cost Ledger

**Write Scope:** `apps/api/src/billing/**`, `apps/api/src/generation/**`, `apps/api/src/creation/**`

**Responsibilities:**
- Track model and asset costs before commercial launch.

**Tasks:**
1. Define usage ledger for text tokens, image calls, asset jobs, room NPC calls, and package generation jobs.
2. Attach usage records to actor/workspace/package/room.
3. Add budget limits per workspace and per job.
4. Add admin usage summary endpoint.
5. Add tests for budget rejection and usage recording.

**Acceptance:** Expensive backend work is measurable and limitable.

---

## Stage 5: Production Operations And Security

**Goal:** Make the backend deployable, observable, secure, and maintainable.

**Estimated Effort:** 5-8 person-weeks.

### Agent A: Database Migrations And Seed Data

**Write Scope:** database schema/migration tooling, `apps/api/src/**`, `docs/operations/**`

**Responsibilities:**
- Replace ad-hoc schema setup with controlled migrations.

**Tasks:**
1. Choose migration tooling compatible with current `pg` usage.
2. Convert content/runtime schema creation into migrations.
3. Add migration command and CI check.
4. Add seed data for demo/golden packages without overwriting production data.
5. Add rollback/backup notes to operations docs.

**Acceptance:** Environments can be upgraded reproducibly.

### Agent B: Observability And Incident Support

**Write Scope:** `apps/api/src/observability/**`, `apps/api/src/request-logging.interceptor.ts`, `docs/operations/**`

**Responsibilities:**
- Add production-grade logs, metrics, and traces at backend boundaries.

**Tasks:**
1. Add request id propagation.
2. Add structured logs for provider calls, job executions, publish attempts, and runtime actions.
3. Add health endpoints for DB, Redis, provider configuration, and worker readiness.
4. Add metrics counters/histograms for latency, provider failures, job states, and runtime conflicts.
5. Add incident runbook entries.

**Acceptance:** Backend failures can be diagnosed without reading raw console logs only.

### Agent C: Security Hardening

**Write Scope:** `apps/api/src/**`, `docs/operations/**`

**Responsibilities:**
- Harden API inputs, secrets, and operational boundaries.

**Tasks:**
1. Add centralized input size limits and JSON body limits.
2. Add rate limits for generation, asset, NPC, auth, and room action endpoints.
3. Add secret/config validation with startup failure for required production settings.
4. Add CORS policy by environment.
5. Add tests for unauthorized, over-limit, and malformed requests.
6. Add dependency/security audit notes to release checklist.

**Acceptance:** Common production abuse paths fail explicitly and safely.

### Agent D: Worker Deployment Model

**Write Scope:** `apps/api/src/**`, package scripts, deployment docs

**Responsibilities:**
- Split HTTP API and long-running workers without duplicating business logic.

**Tasks:**
1. Add worker entrypoint for creation jobs, asset jobs, moderation jobs, and evaluation jobs.
2. Share service modules through dependency injection.
3. Add graceful shutdown for in-flight jobs.
4. Add tests for job lease/claim behavior.
5. Update scripts and docs for running API + worker locally.

**Acceptance:** Long-running backend jobs can run outside the HTTP request lifecycle.

---

## Stage 6: Launch Readiness

**Goal:** Reach a production MVP suitable for limited public usage.

**Estimated Effort:** 3-5 person-weeks after Stages 1-5.

### Required Launch Gates

- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass in CI.
- Database migrations run on a clean DB and existing staging DB.
- Asset provider, model provider, moderation provider, and budget limits are configured in staging.
- Publish gate blocks invalid, unmoderated, or unevaluated packages.
- Runtime room actions are revision-safe and scoped snapshots do not leak private data.
- Auth/RBAC protects admin, creator, and player boundaries.
- Audit log records publish, asset execution, room actions, NPC asks, and moderation decisions.
- Backups and restore drill are documented.
- Incident checklist covers provider outage, job queue stall, DB errors, and content takedown.

---

## Parallel Execution Map

### Batch 1: Controlled Beta Backend
- Agent A: Real asset provider backend.
- Agent B: Runtime SSE backend.
- Agent C: Minimal backend identity boundary.
- Agent D: Audit trail foundation.

Run after integration:
```bash
pnpm --filter @jubensha/api test -- creation runtime identity audit
pnpm --filter @jubensha/api typecheck
```

### Batch 2: Creator Pipeline Productionization
- Agent A: Generation job queue.
- Agent B: Prompt and model governance.
- Agent C: Moderation and policy gate.
- Agent D: Golden dataset and evaluation runs.

Run after integration:
```bash
pnpm --filter @jubensha/api test -- creation generation moderation
pnpm --filter @jubensha/dsl test
pnpm typecheck
```

### Batch 3: Runtime Production Backend
- Agent A: Room lifecycle state machine.
- Agent B: Scoped NPC runtime integration.
- Agent C: Replay and recovery backend.
- Agent D: Runtime persistence and scaling.

Run after integration:
```bash
pnpm --filter @jubensha/api test -- runtime generation shadow
pnpm --filter @jubensha/api typecheck
```

### Batch 4: Multi-User Product Backend
- Agent A: Account and session model.
- Agent B: Content catalog and ownership.
- Agent C: Player session and room access.
- Agent D: Billing and cost ledger.

Run after integration:
```bash
pnpm --filter @jubensha/api test -- identity content runtime billing
pnpm typecheck
```

### Batch 5: Production Operations
- Agent A: Database migrations and seed data.
- Agent B: Observability and incident support.
- Agent C: Security hardening.
- Agent D: Worker deployment model.

Run after integration:
```bash
pnpm test
pnpm typecheck
pnpm build
```

---

## Backend Module Target Structure

Recommended final backend module layout:

```text
apps/api/src/
  audit/
  billing/
  content/
  creation/
  generation/
  health/
  identity/
  moderation/
  observability/
  runtime/
  shadow/
  workers/
```

Rules:
- `creation` may orchestrate providers but must not own identity, billing, or audit primitives.
- `runtime` owns room authority and may call `generation` only through explicit services.
- `content` owns package lifecycle and publish state.
- `identity` owns actors, sessions, roles, and guards.
- `audit` is append-only from business modules.
- `billing` records usage from provider and job boundaries.
- `workers` owns execution entrypoints, not business rules.

---

## Testing Strategy

### Unit And Contract Tests
- Every new service gets colocated `*.test.ts`.
- Every route addition updates `api-contract.test.ts`.
- Provider adapters must test configured, unconfigured, failure, and malformed response paths.

### Integration Tests
- Postgres repository tests should run when DB env is configured and skip explicitly otherwise.
- Runtime concurrency tests must cover stale revisions and seat isolation.
- Publish tests must cover blocked and allowed paths at mutation time.

### Golden And Evaluation Tests
- Golden packages must cover at least mystery, emotion, horror, comedy, and mechanism variants.
- Evaluation run must fail on unreachable scenes, missing truth support, private leakage, and publish gate blockers.

### Release Verification
Always run before claiming backend completion:
```bash
pnpm test
pnpm typecheck
pnpm build
```

---

## Risk Register

| Risk | Impact | Backend Control |
|---|---|---|
| Provider outage | Creation/assets/NPC unavailable | Explicit provider errors, job retry policy, operator-visible status |
| Cost spike | Budget overrun | Cost ledger, budget controller, per-job estimates |
| Private clue leakage | Game fairness failure | Scoped snapshots, shadow validation, prompt constraints, leakage tests |
| Bad generated content | Unsafe or low-quality package | Moderation gate, QualityGate, golden eval, publish blockers |
| Runtime state corruption | Broken rooms | Event replay, optimistic concurrency, recovery tooling |
| Unauthorized publish | Governance failure | RBAC guards, audit trail, publish gate at mutation time |
| Queue stuck | Jobs never complete | Worker health, leases, metrics, retry/error states |
| DB migration failure | Deployment blocked | Migration dry runs, rollback docs, backups |

---

## Estimated Completion From Current State

From the current usable alpha:
- Controlled backend beta: 4-6 person-weeks.
- Production creator pipeline: 5-8 person-weeks.
- Production runtime backend: 6-10 person-weeks.
- Multi-user product backend: 8-14 person-weeks.
- Production operations/security: 5-8 person-weeks.
- Launch hardening: 3-5 person-weeks.

Total remaining backend effort for a limited public MVP: **31-51 person-weeks**.

With 3 strong full-stack/backend agents working in parallel, a realistic calendar estimate is **10-16 weeks** if product decisions and provider credentials are not blocked.

---

## Definition Of Backend Complete

Backend can be considered complete for commercial MVP when:
- A creator can generate, evaluate, moderate, asset-build, and submit a package through backend jobs.
- An operator can review, approve, publish, audit, and takedown content.
- Players can create/join/reconnect to rooms, receive live events, act with revision safety, and interact with NPCs through shadow validation.
- Identity, RBAC, audit, billing, moderation, migrations, workers, health checks, and observability are all active in staging.
- CI and release checklist prove the above with automated tests and documented smoke checks.
