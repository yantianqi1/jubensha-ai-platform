# Script Quality Evaluation Harness

## Scope

This harness measures whether deterministic StoryBible and ScriptPackage drafts are suitable for the MVP script creation review loop. It focuses on the existing backend creation path:

brief → planner → StoryBible reference validation → critic → bounded retry → compiler → deterministic quality gate → content draft save → job persistence.

It answers:

- Whether a StoryBible artifact exists and can be treated as structurally generated output.
- Whether that StoryBible compiles into a ScriptPackage draft.
- Whether deterministic package diagnostics contain blocking errors.
- Which stage produced visible issues: planner, critic, compiler, quality gate, or content draft.
- Whether a generated draft is ready for human review, blocked, or failed.

## Non-Goals

The harness does not:

- Redesign the UI or runtime flow.
- Auto-publish generated scripts.
- Create runtime rooms.
- Add durable multi-step agent orchestration.
- Repair failed quality-gate outputs.
- Require real external LLM calls in CI.
- Claim a script is creatively good just because schema validation passes.

## Deterministic CI vs Live LLM Evaluation

CI tests use concise golden briefs and deterministic fake StoryBible / critic outputs. They do not call configured model providers, so results remain repeatable and safe for pull requests.

Live provider evaluation should remain opt-in only. A future manual script can run the same golden briefs against real providers when `ENABLE_LIVE_LLM_EVAL=true`, but it must not publish packages, create runtime rooms, or commit generated outputs.

## Readiness Terms

- `structurally valid`: the StoryBible object exists and can be parsed by the schema.
- `compiled`: a ScriptPackage draft exists after compiler execution.
- `deterministic-ready`: the deterministic quality gate has no blocking errors.
- `ready_for_review`: suitable for human review; publish remains a separate action.
- `readyForPublish`: deterministic publish gate has no blocking errors.
- `blocked`: an artifact exists, but critic or deterministic diagnostics block review readiness.
- `failed`: pipeline execution failed, most commonly during planning or compilation.

## Current Known Limitations

- The creation job still runs synchronously.
- Intermediate stage transitions are not persisted live.
- Quality failure blocks instead of invoking a repair loop.
- Truth-support, flow, and simulation diagnostics can be warning-level or shallow.
- Private information leakage is not currently detected by schema or deterministic quality gate; the test suite documents this as a skipped TODO rather than faking support.

## Next Recommended Commit

Add a quality repair loop after this baseline is stable. The repair loop should consume critic and deterministic diagnostics explicitly, rerun bounded planning or package repair, and keep failure details visible when repair cannot resolve the issue.

## Repair Loop Update

The follow-up repair loop is documented in `docs/plans/script-quality-repair-loop.md`. It keeps CI deterministic by using fake repair agents in tests, caps repair attempts at a small MVP default, and preserves explicit blocked/failed outcomes when repair cannot clear diagnostics.
