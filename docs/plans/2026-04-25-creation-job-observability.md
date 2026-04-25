# Creation Job Observability

## Endpoints

- `POST /creation/generation-jobs`: creates a queued generation job and returns the same job detail DTO used by polling.
- `GET /creation/generation-jobs/:jobId`: returns the latest front-end-friendly job detail DTO with `Cache-Control: no-store`.
- `POST /creation/generation-jobs/:jobId/run`: runs the current synchronous pipeline and returns the final job detail DTO.
- `GET /creation/generation-jobs/:jobId/events`: existing SSE endpoint for persisted job events; richer stage streaming is deferred.

## Job Detail Shape

The detail DTO is intentionally summary-first so `apps/web` can poll without loading full StoryBible or ScriptPackage JSON by default.

Top-level fields:

- `jobId`, `status`, `currentStage`, `progressPercent`
- `createdAt`, `updatedAt`
- `input`: safe brief summary
- `stages`: ordered UI stage timeline with `pending | active | completed | blocked | failed`
- `activity`: UI activity log entries with level, message, optional code, stage, timestamp, and details
- `result`: story bible summary, critic review summary, package draft summary, quality report summary, `readyForPublish`, `draftPackageId`, and structured errors

## Polling Strategy For Prompt B

The web client can poll `GET /creation/generation-jobs/:jobId` and render directly from:

- `status`, `currentStage`, `progressPercent` for hero state
- `stages` for the stepper
- `activity` for the log panel
- `result.*Summary`, `result.qualityReport`, and `result.errors` for result cards

Polling does not require SSE. The endpoint returns latest persisted job state and uses `Cache-Control: no-store`.

## Future SSE Shape

Future streaming should emit the same activity item shape used in `activity`:

```json
{
  "id": "generation_job_1:deterministic_review:Deterministic review passed",
  "stage": "deterministic_review",
  "level": "success",
  "message": "Deterministic review passed",
  "code": "optional_code",
  "timestamp": "2026-04-25T08:00:00.000Z",
  "details": {}
}
```

Do not invent stage progress events; only stream persisted transitions or real pipeline callbacks.

## Safety Notes

- Job detail summaries omit private role secrets and full package truth fields.
- A saved content draft does not imply publish readiness.
- The creation pipeline does not auto-publish, create stable versions, create rooms, or mutate runtime state.
