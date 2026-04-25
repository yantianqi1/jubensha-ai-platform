# Script Quality Repair Loop

## What It Does

The creation pipeline now has a bounded repair loop after StoryBible planning, critic review, compilation, and deterministic quality review.

Flow:

brief → planner / critic bounded StoryBible loop → compiler → quality gate → repair if compiler or quality gate blocks → compile + quality gate again → ready_for_review, blocked, or failed.

## Repair Targets

The MVP repair loop repairs upstream StoryBible proposals, not saved content drafts or runtime state. The compiler remains deterministic and re-runs from the repaired StoryBible.

Supported deterministic repair targets:

- Compiler failure when a usable StoryBible exists, for example missing clues that prevent package compilation.
- Deterministic quality gate errors when a ScriptPackage draft compiles but has blocking diagnostics.

Repair receives structured context:

- Original brief.
- Current StoryBible.
- Critic diagnostics.
- Quality diagnostics.
- Compiler error, when present.
- Previous repair attempts.

## Bounds

`DEFAULT_MAX_REPAIR_ATTEMPTS` is `1` for MVP. The pipeline records every repair attempt with:

- attempt number.
- repair stage: `compiler`, `quality_gate`, or `story_bible`.
- source issue codes.
- input summary.
- repaired StoryBible when applied.
- structured diagnostics.
- status: `applied`, `skipped`, or `failed`.
- failure or skip reason when available.

No infinite loop is possible because repair attempts are capped before recursive compile/review retries.

## Result Semantics

- `ready_for_review`: final repaired or original draft passes deterministic readiness.
- `blocked`: final draft exists but critic or quality diagnostics still block readiness.
- `failed`: compilation or repair failed before a reviewable package could be produced.
- `readyForPublish`: deterministic publish gate has no blocking errors; publish remains a separate explicit action.

If repair succeeds, the final draft can be saved by `runJob` using the existing draft semantics. The repair loop does not auto-publish and does not create runtime rooms.

## Deterministic CI vs Future Live Repair

CI uses fixture-driven fake repair agents. No real external LLM provider is required or called.

A future provider-backed repair agent can reuse the same `ScriptRepairAgent` contract, but live evaluation should remain opt-in and explicitly gated, for example by `ENABLE_LIVE_LLM_EVAL=true`.

## Current Gaps

- Private information leakage is still not detected by schema or deterministic quality gate, so repair must not claim to fix it.
- Quality repair currently changes StoryBible only; direct ScriptPackage patching is intentionally out of scope.
- The job still runs synchronously and does not persist live intermediate stage transitions.
- Repair quality depends on diagnostics being specific enough to guide the repair agent.
