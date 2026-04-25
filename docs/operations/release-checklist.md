# Release Checklist

Use this checklist before cutting a release candidate or promoting a build.

## CI Baseline

- Confirm the GitHub Actions `CI` workflow completed on the release commit.
- Confirm `pnpm install --frozen-lockfile` completed without lockfile changes.
- Confirm `pnpm test` completed without failing suites.
- Confirm `pnpm typecheck` completed without TypeScript errors.
- Confirm `pnpm build` completed for every workspace package.

## API Observability

- Confirm Nest request logging is enabled through `AppModule`.
- Confirm successful API requests log `method`, `path`, and `status`.
- Confirm failed API requests log `method`, `path`, `status`, and `errorCode`.
- Confirm API exceptions still propagate to HTTP filters and are not swallowed.

## Release Readiness

- Confirm asset generation jobs remain explicit queued work, not fake completions.
- Confirm publish review diagnostics are visible to operators.
- Confirm publish-time quality gates block invalid release packages.
- Confirm admin review surfaces show release readiness and asset job state.


## Usable Alpha Smoke

- Confirm Studio can generate a StoryBible, retry generation, compile a draft, and hand the package id to Admin.
- Confirm Admin can read publish review, inspect blockers, inspect asset jobs, and trigger explicit publish with semver.
- Confirm invalid drafts remain blocked by `PublishGate` and show structured error details.
- Confirm Play can create or start a room, join a seat, read public snapshots, and read seat-private snapshots.
- Confirm Play runtime actions require current `expectedRevision` and show revision conflicts explicitly.
- Confirm no queued asset job is displayed as completed without a real provider result.

## Operations Handoff

- Record the release commit SHA and CI workflow URL.
- Record any skipped database integration tests and the reason they were skipped.
- Record unresolved release blockers in the release tracking issue.
