import { describe, expect, it } from "vitest";
import { evaluateGenerationJobRecord, evaluateScriptCreationPipelineResult } from "./script-quality-evaluator.js";
import {
  CapturingDraftWriter,
  FixedReviewer,
  brief,
  buildStoryBible,
  createService,
  createStoryResult,
  deterministicDiagnostic,
} from "./generation-job-test-fixtures.js";
import {
  ScriptCreationPipeline,
  type ScriptCreationPipelineDiagnostic,
  type ScriptCreationQualityReviewer,
} from "./script-creation-pipeline.js";
import type { GenerateStoryBibleResult } from "./creation-orchestrator.js";
import type { ScriptRepairAgent, ScriptRepairInput } from "./script-repair-agent.js";
import type { StoryBible } from "@jubensha/dsl";
import { goldenScriptQualityBriefs } from "./quality-evaluation-fixtures.js";

const compilerError = {
  severity: "error" as const,
  code: "compiler_error",
  path: "scriptPackageDraft",
  message: "storyBible.clues must contain at least one item",
  stage: "compiling_draft" as const,
};

describe("ScriptCreationPipeline repair loop", () => {
  it("repairs deterministic quality failures and returns ready_for_review", async () => {
    const repairAgent = new FixedRepairAgent([buildStoryBible(true)]);
    const pipeline = createPipeline({
      storyBible: buildStoryBible(true),
      repairAgent,
      qualityReviewer: new SequenceReviewer([
        { readyForPublish: false, diagnostics: [deterministicDiagnostic] },
        { readyForPublish: true, diagnostics: [] },
      ]),
    });

    const result = await pipeline.run({ brief });

    expect(result.status).toBe("ready_for_review");
    expect(result.readyForPublish).toBe(true);
    expect(result.repairAttempts).toHaveLength(1);
    expect(result.maxRepairAttempts).toBe(1);
    expect(result.repairAttempted).toBe(true);
    expect(result.repairSucceeded).toBe(true);
    expect(result.repairAttempts?.[0]).toMatchObject({
      attemptNumber: 1,
      stage: "quality_gate",
      sourceIssueCodes: ["missing_clue"],
      status: "applied",
    });
    expect(repairAgent.inputs[0]?.qualityDiagnostics).toEqual([deterministicDiagnostic]);
  });

  it("stays blocked when quality repair does not clear diagnostics", async () => {
    const pipeline = createPipeline({
      storyBible: buildStoryBible(true),
      repairAgent: new FixedRepairAgent([buildStoryBible(true)]),
      qualityReviewer: new SequenceReviewer([
        { readyForPublish: false, diagnostics: [deterministicDiagnostic] },
        { readyForPublish: false, diagnostics: [deterministicDiagnostic] },
      ]),
    });

    const result = await pipeline.run({ brief });

    expect(result.status).toBe("blocked");
    expect(result.readyForPublish).toBe(false);
    expect(result.repairSucceeded).toBe(false);
    expect(result.repairAttempts).toHaveLength(1);
    expect(result.errors).toEqual([deterministicDiagnostic]);
  });

  it("repairs compiler failures by producing a compilable StoryBible", async () => {
    const repairAgent = new FixedRepairAgent([buildStoryBible(true)]);
    const pipeline = createPipeline({ storyBible: buildStoryBible(false), repairAgent });

    const result = await pipeline.run({ brief });

    expect(result.status).toBe("ready_for_review");
    expect(result.scriptPackageDraft).toBeDefined();
    expect(result.repairSucceeded).toBe(true);
    expect(result.repairAttempts).toEqual([
      expect.objectContaining({ stage: "compiler", sourceIssueCodes: ["compiler_error"], status: "applied" }),
    ]);
    expect(result.repairAttempts?.[0]?.diagnostics).toEqual([compilerError]);
  });

  it("keeps unrepairable compiler failures failed with repair reason", async () => {
    const repairAgent = new FailingRepairAgent("repair provider rejected patch");
    const pipeline = createPipeline({ storyBible: buildStoryBible(false), repairAgent });

    const result = await pipeline.run({ brief });

    expect(result.status).toBe("failed");
    expect(result.repairAttempted).toBe(true);
    expect(result.repairSucceeded).toBe(false);
    expect(result.repairAttempts).toEqual([
      expect.objectContaining({ stage: "compiler", status: "failed", reason: "repair provider rejected patch" }),
    ]);
    expect(result.errors[0]).toMatchObject({ code: "compiler_error", stage: "compiling_draft" });
  });

  it("does not run repair for critic-blocked stories", async () => {
    const repairAgent = new FixedRepairAgent([buildStoryBible(true)]);
    const pipeline = createPipeline({
      storyBible: buildStoryBible(true),
      criticDiagnostics: [{ severity: "error", code: "timeline_conflict", path: "truth.timeline", message: "时间线冲突。" }],
      repairAgent,
    });

    const result = await pipeline.run({ brief });

    expect(result.status).toBe("blocked");
    expect(result.repairAttempts).toEqual([]);
    expect(repairAgent.inputs).toEqual([]);
  });

  it("runJob persists repair history and saves only final draft", async () => {
    const draftWriter = new CapturingDraftWriter();
    const service = createService({
      draftWriter,
      repairAgent: new FixedRepairAgent([buildStoryBible(true)]),
      storyResult: createStoryResult([], buildStoryBible(false)),
    });
    const queued = await service.createJob(brief);

    const completed = await service.runJob(queued.id);

    expect(completed.status).toBe("ready_for_review");
    expect(completed.pipelineResult?.repairAttempts).toHaveLength(1);
    expect(completed.pipelineResult?.repairSucceeded).toBe(true);
    expect(completed.draftPackageId).toBe("package_1");
    expect(draftWriter.savedPackages).toHaveLength(1);
    expect(draftWriter.releasedVersions).toEqual([]);
    expect(evaluateGenerationJobRecord(completed)).toMatchObject({ repairAttemptCount: 1, repairSucceeded: true });
  });

  it("evaluator exposes repaired and unrepaired classifications", async () => {
    const repaired = await createPipeline({
      storyBible: buildStoryBible(false),
      repairAgent: new FixedRepairAgent([buildStoryBible(true)]),
    }).run({ brief });
    const unrepaired = await createPipeline({
      storyBible: buildStoryBible(true),
      repairAgent: new FixedRepairAgent([buildStoryBible(true)]),
      qualityReviewer: new FixedReviewer(false, [deterministicDiagnostic]),
    }).run({ brief });

    expect(evaluateScriptCreationPipelineResult(repaired)).toMatchObject({
      readiness: "ready_for_review",
      repairAttemptCount: 1,
      repairSucceeded: true,
    });
    expect(evaluateScriptCreationPipelineResult(unrepaired)).toMatchObject({
      readiness: "blocked",
      repairAttemptCount: 1,
      repairSucceeded: false,
      repairIssueSummary: { errors: 1 },
    });
  });

  it("improves one deterministic golden blocked fixture when fake repair is configured", async () => {
    const campusFixture = goldenScriptQualityBriefs.find((fixture) => fixture.id === "campus_mystery_6p");
    const pipeline = createPipeline({
      storyBible: buildStoryBible(true),
      repairAgent: new FixedRepairAgent([buildStoryBible(true)]),
      qualityReviewer: new SequenceReviewer([
        { readyForPublish: false, diagnostics: [deterministicDiagnostic] },
        { readyForPublish: true, diagnostics: [] },
      ]),
    });

    const result = await pipeline.run({ brief: campusFixture?.brief ?? brief });

    expect({ before: "blocked", after: result.status }).toEqual({ before: "blocked", after: "ready_for_review" });
    expect(result.repairSucceeded).toBe(true);
  });
});

interface CreatePipelineOptions {
  readonly storyBible: StoryBible;
  readonly criticDiagnostics?: GenerateStoryBibleResult["criticDiagnostics"];
  readonly qualityReviewer?: ScriptCreationQualityReviewer;
  readonly repairAgent?: ScriptRepairAgent;
}

function createPipeline(options: CreatePipelineOptions): ScriptCreationPipeline {
  return new ScriptCreationPipeline({
    orchestrator: { generateStoryBible: async () => createStoryResult(options.criticDiagnostics ?? [], options.storyBible) } as never,
    qualityReviewer: options.qualityReviewer,
    repairAgent: options.repairAgent,
    runIdGenerator: () => "repair_run",
  });
}

class FixedRepairAgent implements ScriptRepairAgent {
  readonly inputs: ScriptRepairInput[] = [];

  constructor(private readonly repairedStoryBibles: readonly StoryBible[]) {}

  async repairStoryBible(input: ScriptRepairInput) {
    this.inputs.push(input);
    const storyBible = this.repairedStoryBibles[this.inputs.length - 1];

    if (!storyBible) {
      throw new Error("No repaired StoryBible fixture configured");
    }

    return { repairedStoryBible: storyBible, diagnostics: [] };
  }
}

class FailingRepairAgent implements ScriptRepairAgent {
  constructor(private readonly message: string) {}

  async repairStoryBible() {
    throw new Error(this.message);
  }
}

class SequenceReviewer implements ScriptCreationQualityReviewer {
  private index = 0;

  constructor(private readonly reviews: readonly ReviewFixture[]) {}

  reviewPackage() {
    const review = this.reviews[Math.min(this.index, this.reviews.length - 1)];
    this.index += 1;
    const errors = review.diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;

    return {
      readyForPublish: review.readyForPublish,
      diagnostics: review.diagnostics,
      summary: { errors, warnings: 0, info: 0 },
      report: { headline: "sequence", readinessLabel: errors > 0 ? "blocked" as const : "ready" as const, sections: [] },
    };
  }
}

interface ReviewFixture {
  readonly readyForPublish: boolean;
  readonly diagnostics: readonly ScriptCreationPipelineDiagnostic[];
}
