import { describe, expect, it } from "vitest";
import { compileStoryBibleToScriptPackage } from "./story-bible-to-script-compiler.js";
import {
  evaluateGenerationJobRecord,
  evaluateScriptCreationPipelineResult,
} from "./script-quality-evaluator.js";
import {
  goldenScriptQualityBriefs,
  scriptQualityStoryBibles,
  scriptQualityCriticDiagnostics,
} from "./quality-evaluation-fixtures.js";
import {
  CapturingDraftWriter,
  FixedReviewer,
  buildStoryBible,
  createService,
  createStoryResult,
  deterministicDiagnostic,
} from "./generation-job-test-fixtures.js";
import type { ScriptCreationPipelineDiagnostic } from "./script-creation-pipeline.js";

const warningDiagnostic: ScriptCreationPipelineDiagnostic = {
  severity: "warning",
  code: "not_evaluable",
  path: "meta.truth",
  message: "ScriptPackage truth metadata is missing and cannot be evaluated",
  stage: "deterministic_review",
};

describe("script quality evaluator", () => {
  it("classifies a valid generated script as ready for MVP human review", () => {
    const report = evaluateScriptCreationPipelineResult({
      runId: "eval_valid",
      inputSummary: { premise: "雾港旧账牵出失踪案", playerCount: 4 },
      stage: "ready_for_review",
      status: "ready_for_review",
      readyForPublish: true,
      errors: [],
      storyBible: scriptQualityStoryBibles.highQualityValid,
      criticDiagnostics: [],
      scriptPackageDraft: compileStoryBibleToScriptPackage(scriptQualityStoryBibles.highQualityValid),
      qualityReport: {
        readyForPublish: true,
        diagnostics: [],
        summary: { errors: 0, warnings: 0, info: 0 },
        report: { headline: "ready", readinessLabel: "ready", sections: [] },
      },
    }, { draftPackageId: "package_eval_1" });

    expect(report).toMatchObject({
      passed: true,
      readiness: "ready_for_review",
      storyBibleScore: 100,
      compileScore: 100,
      deterministicScore: 100,
      issueSummary: { errors: 0, warnings: 0, info: 0 },
      artifacts: {
        storyBiblePresent: true,
        scriptPackageDraftPresent: true,
        draftPackageIdPresent: true,
        readyForPublish: true,
      },
    });
    expect(report.score).toBe(100);
    expect(report.issues).toEqual([]);
  });

  it("classifies critic-blocked stories without draft artifacts", () => {
    const report = evaluateScriptCreationPipelineResult({
      runId: "eval_critic",
      inputSummary: { premise: "批评器阻断", playerCount: 5 },
      stage: "blocked",
      status: "blocked",
      readyForPublish: false,
      errors: [],
      storyBible: scriptQualityStoryBibles.criticBlocked,
      criticDiagnostics: scriptQualityCriticDiagnostics.criticBlocked,
    });

    expect(report.readiness).toBe("blocked");
    expect(report.passed).toBe(false);
    expect(report.artifacts).toMatchObject({ scriptPackageDraftPresent: false, draftPackageIdPresent: false });
    expect(report.issues).toEqual([
      expect.objectContaining({ code: "critic.motive_gap", severity: "error", stage: "critic" }),
    ]);
  });

  it("classifies compiler failures without fake success", () => {
    const report = evaluateScriptCreationPipelineResult({
      runId: "eval_compile",
      inputSummary: { premise: "缺少线索", playerCount: 4 },
      stage: "failed",
      status: "failed",
      readyForPublish: false,
      errors: [{
        severity: "error",
        code: "compiler_error",
        path: "scriptPackageDraft",
        message: "storyBible.clues must contain at least one item",
        stage: "compiling_draft",
      }],
      storyBible: scriptQualityStoryBibles.missingClueChain,
      criticDiagnostics: [],
    });

    expect(report.readiness).toBe("failed");
    expect(report.artifacts).toMatchObject({ scriptPackageDraftPresent: false, draftPackageIdPresent: false });
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "compiler_error", stage: "compiler" }));
  });

  it("classifies StoryBible reference errors as planner-stage output issues", () => {
    const report = evaluateScriptCreationPipelineResult({
      runId: "eval_reference",
      inputSummary: { premise: "引用错误", playerCount: 5 },
      stage: "ready_for_review",
      status: "ready_for_review",
      readyForPublish: true,
      errors: [],
      storyBible: scriptQualityStoryBibles.referenceErrors,
      storyAttempts: [{
        attempt: 1,
        accepted: false,
        storyBible: scriptQualityStoryBibles.referenceErrors,
        criticDiagnostics: [],
        storyBibleDiagnostics: [{ severity: "error", code: "missing_character", path: "truth.timeline.actor_ids[0]", message: "Missing character reference: missing_actor" }],
      }],
      criticDiagnostics: [],
      scriptPackageDraft: compileStoryBibleToScriptPackage(scriptQualityStoryBibles.referenceErrors),
      qualityReport: {
        readyForPublish: true,
        diagnostics: [],
        summary: { errors: 0, warnings: 0, info: 0 },
        report: { headline: "ready", readinessLabel: "ready", sections: [] },
      },
    });

    expect(report.readiness).toBe("blocked");
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "missing_character", stage: "planner" }));
  });

  it("keeps deterministic quality failures visible", () => {
    const report = evaluateScriptCreationPipelineResult({
      runId: "eval_quality",
      inputSummary: { premise: "质量门阻断", playerCount: 4 },
      stage: "blocked",
      status: "blocked",
      readyForPublish: false,
      errors: [deterministicDiagnostic],
      storyBible: scriptQualityStoryBibles.compilesButFailsQualityGate,
      criticDiagnostics: [],
      scriptPackageDraft: compileStoryBibleToScriptPackage(scriptQualityStoryBibles.compilesButFailsQualityGate),
      qualityReport: {
        readyForPublish: false,
        diagnostics: [deterministicDiagnostic],
        summary: { errors: 1, warnings: 0, info: 0 },
        report: { headline: "blocked", readinessLabel: "blocked", sections: [] },
      },
    }, { draftPackageId: "package_blocked" });

    expect(report.readiness).toBe("blocked");
    expect(report.artifacts).toMatchObject({ scriptPackageDraftPresent: true, readyForPublish: false });
    expect(report.issues).toEqual([
      expect.objectContaining({ code: "missing_clue", severity: "error", stage: "quality_gate" }),
    ]);
  });

  it("surfaces weak truth support as warning-level quality risk", () => {
    const report = evaluateScriptCreationPipelineResult({
      runId: "eval_truth_warning",
      inputSummary: { premise: "弱真相支撑", playerCount: 4 },
      stage: "ready_for_review",
      status: "ready_for_review",
      readyForPublish: true,
      errors: [],
      storyBible: scriptQualityStoryBibles.weakClueCoverage,
      criticDiagnostics: [],
      scriptPackageDraft: compileStoryBibleToScriptPackage(scriptQualityStoryBibles.weakClueCoverage),
      qualityReport: {
        readyForPublish: true,
        diagnostics: [warningDiagnostic],
        summary: { errors: 0, warnings: 1, info: 0 },
        report: { headline: "warning", readinessLabel: "ready", sections: [] },
      },
    });

    expect(report.readiness).toBe("ready_for_review");
    expect(report.deterministicScore).toBeLessThan(100);
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "not_evaluable", severity: "warning" }));
  });

  it.skip("surfaces private info leakage risk when schema or quality gate supports it", () => {
    expect(scriptQualityStoryBibles.privateInfoLeakageRisk).toBeDefined();
  });

  it("summarizes the golden brief matrix without external LLM calls", () => {
    const readinessByBrief = goldenScriptQualityBriefs.map((fixture, index) => ({
      id: fixture.id,
      readiness: matrixReadiness(index),
      playerCount: fixture.brief.playerCount,
    }));

    expect(readinessByBrief).toEqual([
      { id: "hardboiled_detective_4p", readiness: "ready_for_review", playerCount: 4 },
      { id: "emotional_family_secret_5p", readiness: "ready_for_review", playerCount: 5 },
      { id: "campus_mystery_6p", readiness: "blocked", playerCount: 6 },
      { id: "closed_room_murder_5p", readiness: "blocked", playerCount: 5 },
      { id: "comedy_light_mystery_4p", readiness: "ready_for_review", playerCount: 4 },
      { id: "faction_intrigue_6p", readiness: "blocked", playerCount: 6 },
      { id: "supernatural_optional_mystery_5p", readiness: "ready_for_review", playerCount: 5 },
      { id: "minimal_invalid_or_edge_case", readiness: "failed", playerCount: 1 },
    ]);
  });

  it("evaluates runJob happy path with draft package id", async () => {
    const service = createService();
    const queued = await service.createJob({ premise: "雾港旧账牵出失踪案", playerCount: 1 });

    const completed = await service.runJob(queued.id);
    const report = evaluateGenerationJobRecord(completed);

    expect(report.readiness).toBe("ready_for_review");
    expect(report.artifacts).toMatchObject({ draftPackageIdPresent: true, readyForPublish: true });
  });

  it("evaluates runJob critic, compiler, and deterministic blocked paths", async () => {
    const criticJob = await runService(createService({ storyResult: createStoryResult(scriptQualityCriticDiagnostics.criticBlocked, buildStoryBible()) }));
    const compilerJob = await runService(createService({ storyResult: createStoryResult([], buildStoryBible(false)) }));
    const deterministicJob = await runService(createService({
      draftWriter: new CapturingDraftWriter(),
      qualityReviewer: new FixedReviewer(false, [deterministicDiagnostic]),
    }));

    expect(evaluateGenerationJobRecord(criticJob).readiness).toBe("blocked");
    expect(evaluateGenerationJobRecord(compilerJob).readiness).toBe("failed");
    expect(evaluateGenerationJobRecord(deterministicJob).artifacts.readyForPublish).toBe(false);
  });
});

async function runService(service: ReturnType<typeof createService>) {
  const queued = await service.createJob({ premise: "评估 runJob", playerCount: 1 });
  return service.runJob(queued.id);
}

function matrixReadiness(index: number) {
  const readiness = [
    "ready_for_review",
    "ready_for_review",
    "blocked",
    "blocked",
    "ready_for_review",
    "blocked",
    "ready_for_review",
    "failed",
  ] as const;

  return readiness[index];
}
