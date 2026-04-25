# LLM Script Generation Full Flow Development Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for parallel implementation batches, and use superpowers:test-driven-development for every behavior change.

**Goal:** Turn the current Studio alpha into a complete LLM-driven script generation production flow: creator input → generation job → StoryBible → package draft → validation/evaluation → human revision → moderation/assets → publish-ready version.

**Architecture:** Keep schemas and deterministic checks in `packages/dsl`; keep LLM orchestration, prompt contracts, generation jobs, and repair loops in `apps/api/src/creation`; keep moderation, cost, audit, and identity as explicit cross-cutting modules; keep frontend Studio as a thin workflow client over backend state. No step may fake provider success, silently fallback to demo content, or publish content without explicit diagnostics.

**Tech Stack:** TypeScript, NestJS, Zod, Vitest, PostgreSQL, pnpm/Turborepo, OpenAI-compatible LLM provider adapters, deterministic DSL validation, HTTP first with SSE for job progress.

---

## 1. Current State

### Already Available

- `apps/web/src/studio-browser-workflow.ts` can submit a Studio form, call StoryBible generation, display attempts, render relation/diff summaries, and compile the generated StoryBible into a draft.
- `apps/api/src/creation/creation.controller.ts` exposes:
  - `POST /creation/story-bibles/generate`
  - `POST /creation/story-bibles/compile-draft`
- `apps/api/src/creation/creation-orchestrator.ts` runs planner/critic retry attempts.
- `apps/api/src/creation/story-bible-to-script-compiler.ts` compiles StoryBible into `ScriptPackage`.
- `apps/api/src/creation/creation-service.ts` creates draft packages and returns flow/simulation diagnostics.
- `apps/api/src/creation/quality-gate.ts`, publish review, review workbench, theme asset jobs, and golden package checks already exist as early production surfaces.
- `apps/api/src/content` supports draft package persistence and release publishing.
- `apps/api/src/runtime` can run published content.

### Main Gaps

- Generation is synchronous request/response; no durable generation job, progress stream, retry resume, or operator inspection.
- Prompt/response contracts are not versioned as first-class artifacts.
- StoryBible quality scoring is limited; missing deeper mystery-specific evaluation.
- Compiler output is deterministic but repair loop is not yet job-based or multi-pass.
- There is no human edit/revision workflow for generated StoryBible and compiled draft.
- Moderation is not enforced before publish.
- Cost/token/audit records are missing for generation calls.
- Asset generation provider is still explicit unconfigured failure.
- Studio UI does not yet show full job lifecycle or publish readiness as one continuous flow.

---

## 2. Target End-to-End Flow

The complete LLM script generation flow should be:

1. Creator creates a generation brief in Studio.
2. Backend validates brief and creates a durable generation job.
3. Planner LLM generates a StoryBible candidate with provider metadata.
4. Critic LLM evaluates candidate against structured criteria.
5. Repair loop produces improved StoryBible candidates until pass or explicit stop.
6. Backend stores all attempts, prompts, provider metadata, token usage, and diagnostics.
7. Deterministic validator parses and validates final StoryBible.
8. Compiler produces a `ScriptPackage` draft.
9. Static flow diagnostics and simulation diagnostics run automatically.
10. Mystery-specific quality evaluator scores solvability, clue coverage, role balance, pacing, and red-herring safety.
11. Moderation evaluates public text, private secrets, clues, prompts, and asset prompts.
12. Creator edits StoryBible or compiled draft through revision APIs.
13. Backend re-runs validation/evaluation after each revision.
14. Asset manifest and asset jobs are created from approved content.
15. Admin reviews readiness, blockers, costs, generation history, moderation, and assets.
16. Publish gate allows immutable release only when required checks pass.
17. Runtime room can be created from released version.

---

## 3. Development Stages

## Stage A: Durable Generation Job Foundation

**Goal:** Replace one-shot generation with inspectable, resumable backend jobs.

**Write Scope**
- `apps/api/src/creation/generation-job*.ts`
- `apps/api/src/creation/creation.controller.ts`
- `apps/api/src/creation/creation.module.ts`
- `apps/api/src/creation/postgres-generation-job*.ts`
- `apps/api/src/api-contract.ts`
- `apps/web/src/api-client.ts`
- `apps/web/src/studio-browser-workflow.ts`

**Backend Tasks**
1. Define `GenerationJobRecord` with `id`, `status`, `brief`, `attempts`, `selectedAttemptId`, `diagnostics`, `createdAt`, `updatedAt`.
2. Define statuses: `queued`, `planning`, `criticizing`, `repairing`, `compiled`, `blocked`, `failed`, `ready_for_review`.
3. Add repository interface plus in-memory and Postgres implementations.
4. Add `POST /creation/generation-jobs` to create a job.
5. Add `POST /creation/generation-jobs/:jobId/run` to execute job explicitly.
6. Add `GET /creation/generation-jobs/:jobId` to inspect job state.
7. Add `GET /creation/generation-jobs/:jobId/events` SSE progress stream.
8. Keep current `story-bibles/generate` temporarily as compatibility wrapper only if it calls the same job service and exposes no fake success.

**Frontend Tasks**
1. Replace Studio direct generate call with create/run/read job sequence.
2. Show job status timeline and attempt history.
3. Show explicit provider errors and validation blockers.
4. Add reconnect by reading job state after refresh.

**Tests**
- Job create/run/read lifecycle.
- Failed provider call persists failure code/message.
- SSE emits ordered job events.
- Studio workflow renders queued/running/failed/ready states.

**Acceptance**
- A generation can be inspected after page refresh.
- Every LLM attempt is stored with structured metadata.
- Failed provider calls remain visible and do not return a fake StoryBible.

---

## Stage B: Prompt Contract And Provider Traceability

**Goal:** Make LLM prompts, schemas, provider outputs, and model metadata versioned and auditable.

**Write Scope**
- `apps/api/src/creation/prompt-contract*.ts`
- `apps/api/src/creation/story-planner-agent.ts`
- `apps/api/src/creation/story-critic-agent.ts`
- `apps/api/src/creation/creation-model-provider.ts`
- `apps/api/src/generation/model-provider.ts`
- `apps/api/src/cost/**`
- `apps/api/src/audit/**`

**Tasks**
1. Define `PromptContract` with `contractId`, `version`, `role`, `inputSchema`, `outputSchema`, `systemPrompt`, `userPromptTemplate`.
2. Store contract version on every planner/critic call.
3. Store provider metadata: provider, model, base URL host, request id, latency, token estimate, finish reason.
4. Add `ModelCallLedger` for token/cost estimates.
5. Add append-only audit events for generation job created, provider call started/completed/failed, final attempt selected.
6. Add tests that assert no provider call result can be persisted without contract version and model metadata.

**Acceptance**
- Admin can trace any generated sentence back to job attempt, prompt contract, model, and provider call metadata.

---

## Stage C: Multi-Pass Story Architecture Generation

**Goal:** Upgrade generation quality by splitting a full script into controlled stages instead of one monolithic StoryBible prompt.

**Write Scope**
- `apps/api/src/creation/story-architecture*.ts`
- `apps/api/src/creation/story-planner-agent.ts`
- `apps/api/src/creation/story-critic-agent.ts`
- `packages/dsl/src/story-bible-schema.ts`
- `packages/dsl/src/story-bible-validation.ts`
- `apps/web/src/studio-view-model.ts`

**Generation Passes**
1. **Brief normalization:** normalize creator input into genre, player count, tone, constraints, forbidden content, and target duration.
2. **Case core:** generate central mystery, truth timeline, culprit/core secret, victim/event, motive network.
3. **Character web:** generate playable roles, public profiles, private secrets, goals, fears, alibis, relations.
4. **Clue lattice:** generate clues mapped to truth nodes, source characters, unlock timing, public/private visibility, red herrings.
5. **Act structure:** generate act goals, scene seeds, pacing beats, reveal schedule, ending conditions.
6. **StoryBible assembly:** merge passes into one schema-valid StoryBible.
7. **Critic repair:** evaluate contradictions, missing clues, unplayable roles, unsupported reveals, pacing gaps.

**Tasks**
1. Add intermediate schemas for case core, character web, clue lattice, and act structure.
2. Add deterministic merge logic from intermediate artifacts to StoryBible.
3. Add per-pass provider calls with stored attempt metadata.
4. Add repair prompts that target specific failed pass diagnostics.
5. Add Studio display for pass-by-pass progress.

**Acceptance**
- A failed clue lattice does not require regenerating the entire StoryBible.
- Diagnostics point to a specific pass and repair prompt.

---

## Stage D: Mystery Quality Evaluator

**Goal:** Add domain-specific quality gates beyond schema validity.

**Write Scope**
- `apps/api/src/creation/mystery-quality*.ts`
- `packages/dsl/src/package-flow-diagnostics.ts`
- `packages/dsl/src/package-simulation.ts`
- `apps/api/src/creation/publish-review.controller.ts`
- `apps/web/src/admin-view-model.ts`

**Quality Dimensions**
- Solvability: truth can be inferred from available clues.
- Clue coverage: every truth node has supporting clues.
- Role balance: each player has secrets, goals, and meaningful evidence access.
- Red-herring safety: red herrings mislead without contradicting truth.
- Pacing: reveals are distributed across acts.
- Runtime executability: package simulation reaches expected states.
- Replay value: endings and role arcs are not single-note.

**Tasks**
1. Define `MysteryQualityReport` schema.
2. Implement deterministic checks where possible.
3. Add optional LLM critic check for narrative quality, clearly marked as model-scored.
4. Store report on generation job and draft package metadata.
5. Add publish gate blockers for critical quality failures.
6. Render quality report in Admin.

**Acceptance**
- A schema-valid but unsolvable script is blocked with explicit diagnostics.

---

## Stage E: Human Revision And Regeneration Loop

**Goal:** Let creators edit generated content and rerun validation without losing traceability.

**Write Scope**
- `apps/api/src/creation/revision*.ts`
- `apps/api/src/content/content-service.ts`
- `apps/web/src/studio-browser-workflow.ts`
- `apps/web/src/studio-view-model.ts`

**Tasks**
1. Add `StoryBibleRevisionRecord` with parent revision, editor actor, reason, diff summary, validation snapshot.
2. Add APIs to save edited StoryBible revision and compile selected revision.
3. Add targeted regenerate APIs: regenerate role, clue lattice, act structure, or ending.
4. Preserve original LLM attempt and user edits separately.
5. Add diff viewer in Studio: generated vs edited vs regenerated.
6. Re-run validation, quality, moderation, and compile checks on each selected revision.

**Acceptance**
- Creator can manually fix a generated StoryBible, compile it, and still see full provenance.

---

## Stage F: Moderation And Publish Readiness

**Goal:** Prevent unsafe or incomplete generated content from being published.

**Write Scope**
- `apps/api/src/moderation/**`
- `apps/api/src/creation/**`
- `apps/api/src/content/publish-gate.ts`
- `apps/web/src/admin-browser-workflow.ts`

**Moderation Subjects**
- Story premise and synopsis.
- Character public profiles.
- Private secrets.
- Clue content.
- Ending summaries.
- Asset prompts.
- Generated asset references.

**Tasks**
1. Add moderation provider interface with explicit unconfigured error.
2. Add deterministic policy checks for empty/invalid/high-risk categories.
3. Add provider-backed moderation job for configured environments.
4. Store moderation diagnostics and operator decisions.
5. Require moderation pass in publish gate.
6. Add Admin override only if explicitly designed, role-gated, and audited.

**Acceptance**
- Publish fails if moderation has not passed or has unresolved critical findings.

---

## Stage G: Asset Prompt And Real Asset Job Integration

**Goal:** Complete visual asset generation as part of script production without pretending success.

**Write Scope**
- `apps/api/src/creation/theme-asset-provider.ts`
- `apps/api/src/creation/theme-asset-job.ts`
- `apps/api/src/creation/theme-asset-compiler.ts`
- `apps/web/src/admin-browser-workflow.ts`

**Tasks**
1. Add provider config validation from environment.
2. Generate asset prompts from StoryBible/package metadata.
3. Persist asset job lifecycle and provider metadata.
4. Reject rerunning completed jobs explicitly.
5. Link generated asset references back to package draft/release metadata.
6. Show asset readiness in Admin publish review.

**Acceptance**
- A package cannot claim visual assets are ready unless real provider results are stored.

---

## Stage H: Studio Product Flow Integration

**Goal:** Make Studio guide the creator through the whole production chain.

**Write Scope**
- `apps/web/src/studio-*`
- `apps/web/src/admin-*`
- `apps/web/src/api-client.ts`
- `apps/api/src/api-contract.ts`

**Studio Flow**
1. Brief form.
2. Generation job progress.
3. Attempt history.
4. Story architecture view.
5. Relation graph and clue lattice view.
6. Quality/moderation diagnostics.
7. Edit/revision workspace.
8. Compile draft.
9. Send to Admin review.

**Tasks**
1. Expand API client types for generation jobs and revisions.
2. Add Studio state machine to prevent invalid UI actions.
3. Add SSE subscription for generation job progress.
4. Show all blockers in one readiness panel.
5. Keep Play runtime separate from Studio production flow.

**Acceptance**
- A creator can complete the full flow from blank brief to publish-ready package without manually copying IDs between hidden screens.

---

## Stage I: Production Controls

**Goal:** Make generation safe for internal beta and later public launch.

**Write Scope**
- `apps/api/src/identity/**`
- `apps/api/src/audit/**`
- `apps/api/src/cost/**`
- `apps/api/src/observability/**`
- `apps/api/src/app.module.ts`

**Tasks**
1. Add actor identity to generation, revision, moderation, asset, and publish operations.
2. Add RBAC: creator, reviewer, operator, admin.
3. Add cost ledger and per-job budget limits.
4. Add rate limits for generation and asset endpoints.
5. Add structured logs and metrics for provider latency/failure rates.
6. Add admin search over jobs, packages, moderation decisions, and audit records.

**Acceptance**
- Internal beta can identify who generated/published what, how much it cost, and why a publish was allowed or blocked.

---

## 4. Recommended Parallel Batches

### Batch 1: Generation Job Backbone

**Agent A:** Job repository, schemas, lifecycle service.

**Agent B:** API endpoints, API contract, HTTP tests.

**Agent C:** Studio job client, progress UI, reconnect state.

**Validation**
```bash
pnpm --filter @jubensha/api test -- generation-job creation
pnpm --filter @jubensha/web test -- studio api-client
pnpm --filter @jubensha/api typecheck
pnpm --filter @jubensha/web typecheck
```

### Batch 2: Traceability And Cost

**Agent A:** Prompt contract registry and provider metadata.

**Agent B:** Cost ledger module.

**Agent C:** Audit append-only module.

**Validation**
```bash
pnpm --filter @jubensha/api test -- prompt cost audit creation
pnpm --filter @jubensha/api typecheck
```

### Batch 3: Multi-Pass Story Generation

**Agent A:** Intermediate schemas and deterministic merge.

**Agent B:** Planner pass orchestration.

**Agent C:** Studio architecture/clue lattice renderers.

**Validation**
```bash
pnpm --filter @jubensha/api test -- story-architecture story-planner creation-orchestrator
pnpm --filter @jubensha/web test -- studio-view-model studio-browser-workflow
```

### Batch 4: Evaluation And Revision

**Agent A:** Mystery quality evaluator.

**Agent B:** StoryBible revision APIs.

**Agent C:** Studio diff/edit workflow.

**Validation**
```bash
pnpm --filter @jubensha/api test -- mystery-quality revision publish-gate
pnpm --filter @jubensha/web test -- studio
```

### Batch 5: Moderation And Asset Readiness

**Agent A:** Moderation provider/jobs/publish gate.

**Agent B:** Real asset provider adapter and asset metadata.

**Agent C:** Admin readiness UI.

**Validation**
```bash
pnpm --filter @jubensha/api test -- moderation theme-asset publish-gate
pnpm --filter @jubensha/web test -- admin
```

---

## 5. Data Model Additions

### Generation Job

```ts
interface GenerationJobRecord {
  readonly id: string;
  readonly status: GenerationJobStatus;
  readonly brief: GenerationBrief;
  readonly attempts: readonly GenerationAttemptRecord[];
  readonly selectedAttemptId: string | null;
  readonly draftPackageId: string | null;
  readonly diagnostics: readonly GenerationDiagnostic[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

### Generation Attempt

```ts
interface GenerationAttemptRecord {
  readonly id: string;
  readonly jobId: string;
  readonly pass: GenerationPass;
  readonly promptContractId: string;
  readonly promptContractVersion: string;
  readonly providerCallId: string;
  readonly storyBible: unknown | null;
  readonly diagnostics: readonly GenerationDiagnostic[];
  readonly createdAt: string;
}
```

### Provider Call

```ts
interface ProviderCallRecord {
  readonly id: string;
  readonly provider: string;
  readonly model: string;
  readonly route: string;
  readonly latencyMs: number;
  readonly tokenUsage: TokenUsageEstimate;
  readonly status: "completed" | "failed";
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
}
```

---

## 6. API Surface Target

### Creation

- `POST /creation/generation-jobs`
- `GET /creation/generation-jobs/:jobId`
- `POST /creation/generation-jobs/:jobId/run`
- `GET /creation/generation-jobs/:jobId/events`
- `POST /creation/generation-jobs/:jobId/revisions`
- `POST /creation/generation-jobs/:jobId/revisions/:revisionId/compile-draft`
- `POST /creation/generation-jobs/:jobId/regenerate/:pass`

### Review

- `GET /creation/review-workbench/packages/:packageId`
- `GET /creation/publish-review/packages/:packageId`
- `POST /creation/packages/:packageId/moderation/run`
- `POST /creation/theme-assets/jobs`
- `POST /creation/theme-assets/jobs/:jobId/run`

### Content

- Existing package and version APIs remain the publishing authority.

---

## 7. Completion Definition

The LLM script generation flow is complete when:

- Creator can start from a blank brief and create a durable generation job.
- Planner/critic/repair attempts are persisted with prompt contract, model, provider, token/cost, and diagnostics.
- StoryBible is generated through multi-pass architecture or an equivalent inspectable pipeline.
- Compiler produces a draft package from the selected revision.
- Static diagnostics, simulation, mystery quality, moderation, and asset readiness are visible.
- Creator can edit/regenerate selected parts and re-run checks.
- Admin can review all blockers and publish only when gates pass.
- Runtime can create a room from the published version.
- Failures are explicit and visible; no hidden fallback or fake success path exists.

---

## 8. Suggested First Implementation Order

1. Durable generation job repository and lifecycle.
2. Generation job API endpoints and API contract.
3. Studio job progress UI and reconnect.
4. Prompt contract/provider traceability.
5. Cost ledger and audit events.
6. Multi-pass generation schemas and merge.
7. Mystery quality evaluator.
8. Revision/edit/regenerate APIs.
9. Moderation publish gate.
10. Asset provider productionization.

