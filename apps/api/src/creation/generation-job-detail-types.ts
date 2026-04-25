import type { ScriptPackage } from "@jubensha/dsl";
import type { GenerationJobStatus } from "./generation-job.js";
import type { ScriptCreationPipelineStage } from "./script-creation-pipeline.js";

export type GenerationJobUiStageKey = ScriptCreationPipelineStage | "queued";
export type GenerationJobUiStageState = "pending" | "active" | "completed" | "blocked" | "failed";
export type GenerationJobActivityLevel = "info" | "success" | "warning" | "error";

export interface GenerationJobDetailResponse {
  readonly jobId: string;
  readonly status: GenerationJobStatus;
  readonly currentStage: GenerationJobUiStageKey;
  readonly progressPercent: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly input: GenerationJobInputSummary;
  readonly stages: readonly GenerationJobStageDto[];
  readonly activity: readonly GenerationJobActivityDto[];
  readonly result: GenerationJobResultDto;
}

export interface GenerationJobStageDto {
  readonly key: GenerationJobUiStageKey;
  readonly label: string;
  readonly description: string;
  readonly state: GenerationJobUiStageState;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly diagnostics?: readonly GenerationJobIssueDto[];
}

export interface GenerationJobActivityDto {
  readonly id: string;
  readonly stage?: GenerationJobUiStageKey;
  readonly level: GenerationJobActivityLevel;
  readonly message: string;
  readonly code?: string;
  readonly timestamp?: string;
  readonly details?: unknown;
}

export interface GenerationJobInputSummary {
  readonly title?: string;
  readonly premise: string;
  readonly playerCount: number;
  readonly genre?: string;
}

export interface GenerationJobResultDto {
  readonly storyBibleSummary?: StoryBibleSummaryDto;
  readonly criticReview?: CriticReviewSummaryDto;
  readonly scriptPackageDraftSummary?: ScriptPackageSummaryDto;
  readonly qualityReport?: QualityReportSummaryDto;
  readonly repairSummary?: RepairSummaryDto;
  readonly readyForPublish: boolean | null;
  readonly draftPackageId: string | null;
  readonly errors: readonly GenerationJobIssueDto[];
}

export interface StoryBibleSummaryDto {
  readonly title: string;
  readonly logline: string;
  readonly genre: string;
  readonly tone: string;
  readonly roleCount: number;
  readonly clueCount: number;
  readonly actCount: number;
  readonly timelineCount: number;
}

export interface CriticReviewSummaryDto {
  readonly passed: boolean;
  readonly severity: "info" | "warning" | "error";
  readonly issueCount: number;
  readonly requiredRevisions: readonly GenerationJobIssueDto[];
}

export interface ScriptPackageSummaryDto {
  readonly title: string;
  readonly packageCode: string;
  readonly status: ScriptPackage["status"];
  readonly roleCount: number;
  readonly clueCount: number;
  readonly sceneCount: number;
}

export interface QualityReportSummaryDto {
  readonly readyForPublish: boolean;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly issueCount: number;
  readonly issues: readonly GenerationJobIssueDto[];
}

export interface RepairSummaryDto {
  readonly attempted: boolean;
  readonly succeeded: boolean;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly issueCount: number;
  readonly issues: readonly GenerationJobIssueDto[];
}

export interface GenerationJobIssueDto {
  readonly severity: "info" | "warning" | "error";
  readonly code: string;
  readonly path?: string;
  readonly message: string;
}
