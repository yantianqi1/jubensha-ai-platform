import type { StudioGenerateStoryBibleRequest, StudioGenerateStoryBibleResult } from "./api-client.js";
import {
  buildGenerateRequest,
  createStorySkeletonEditorState,
  formatAttemptSummary,
  formatCompileDraftOutput,
  formatRelationGraph,
  formatRetryDiffSummary,
  type StudioForm,
} from "./studio-view-model.js";

export interface StudioPanelState {
  readonly attempts: string;
  readonly relations: string;
  readonly diff: string;
  readonly skeletonDraft: string;
  readonly skeletonStatus: string;
}

export interface CreationPanelState {
  readonly diagnostics: string;
  readonly output: string;
}

export interface StudioWorkflowPorts {
  readonly readForm: () => StudioForm;
  readonly generateStoryBible: (request: StudioGenerateStoryBibleRequest) => Promise<StudioGenerateStoryBibleResult>;
  readonly compileStoryBibleDraft: (storyBible: unknown) => Promise<unknown>;
  readonly writeCompileSource: (value: string) => void;
  readonly writeAdminPackageId?: (value: string) => void;
  readonly renderStudioPanel: (state: StudioPanelState) => void;
  readonly renderCreationPanel: (state: CreationPanelState) => void;
}

const LOADING_STUDIO_STATE: StudioPanelState = {
  attempts: "生成中...",
  relations: "等待结果。",
  diff: "等待结果。",
  skeletonDraft: "等待结果。",
  skeletonStatus: "骨架等待生成。",
};

export function createStudioWorkflow(ports: StudioWorkflowPorts) {
  let latestStoryBible: unknown;
  let previousStoryBible: unknown;

  return {
    async generateStoryBible(): Promise<void> {
      ports.renderStudioPanel(LOADING_STUDIO_STATE);

      try {
        const result = await ports.generateStoryBible(buildGenerateRequest(ports.readForm()));
        previousStoryBible = latestStoryBible;
        latestStoryBible = result.storyBible;
        ports.writeCompileSource(formatStoryBibleJson(result.storyBible));
        ports.renderStudioPanel(formatStudioResult(result, previousStoryBible, latestStoryBible));
      } catch (error) {
        ports.renderStudioPanel(formatStudioError(readError(error)));
      }
    },
    async compileGeneratedStoryBibleDraft(): Promise<void> {
      if (!latestStoryBible) {
        ports.renderCreationPanel({ diagnostics: "Flow diagnostics 未执行。", output: "请先生成 StoryBible。" });
        return;
      }

      ports.renderCreationPanel({ diagnostics: "Flow diagnostics 等待编译结果...", output: "StoryBible 编译中..." });
      await compileLatestStoryBibleDraft(ports, latestStoryBible);
    },
  };
}

function formatStudioResult(result: StudioGenerateStoryBibleResult, previous: unknown, next: unknown): StudioPanelState {
  const skeleton = createStorySkeletonEditorState(result.storyBible as never);

  return {
    attempts: formatAttemptSummary(result),
    relations: safeFormatRelations(result.storyBible),
    diff: safeFormatDiff(previous, next),
    skeletonDraft: skeleton.draftText,
    skeletonStatus: skeleton.status,
  };
}

async function compileLatestStoryBibleDraft(ports: StudioWorkflowPorts, storyBible: unknown): Promise<void> {
  try {
    const result = await ports.compileStoryBibleDraft(storyBible);
    const packageId = readDraftPackageId(result);
    ports.writeAdminPackageId?.(packageId);
    ports.renderCreationPanel({ diagnostics: renderDiagnosticsSummary(result, packageId), output: formatCompileDraftOutput(result as never) });
  } catch (error) {
    ports.renderCreationPanel({ diagnostics: "Flow diagnostics 未完成。", output: readError(error) });
  }
}

function formatStudioError(message: string): StudioPanelState {
  return {
    attempts: message,
    relations: "生成失败。",
    diff: "生成失败。",
    skeletonDraft: "生成失败。",
    skeletonStatus: "骨架生成失败。",
  };
}

function safeFormatRelations(storyBible: unknown): string {
  try {
    return formatRelationGraph(storyBible as never);
  } catch (error) {
    return `角色关系不可渲染：${readError(error)}`;
  }
}

function safeFormatDiff(previous: unknown, next: unknown): string {
  if (!previous || !next) {
    return "暂无上一版可对比。";
  }

  try {
    return formatRetryDiffSummary(previous as never, next as never);
  } catch (error) {
    return `差异不可渲染：${readError(error)}`;
  }
}

function renderDiagnosticsSummary(result: unknown, packageId: string): string {
  const diagnostics = readFlowDiagnostics(result);

  return diagnostics.length === 0
    ? `Flow diagnostics 通过：未发现静态流程问题。草稿 ${packageId} 已准备好。`
    : `Flow diagnostics 发现 ${diagnostics.length} 个问题。草稿 ${packageId} 仍需审查。`;
}

function readDraftPackageId(result: unknown): string {
  if (!isObjectRecord(result) || !isObjectRecord(result.draftPackage)) {
    throw new Error("Creation draft result is missing draftPackage");
  }

  if (typeof result.draftPackage.id !== "string") {
    throw new Error("Creation draft result is missing draftPackage.id");
  }

  return result.draftPackage.id;
}

function readFlowDiagnostics(result: unknown): readonly unknown[] {
  if (!isObjectRecord(result) || !Array.isArray(result.flowDiagnostics)) {
    return [];
  }

  return result.flowDiagnostics;
}

function formatStoryBibleJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
