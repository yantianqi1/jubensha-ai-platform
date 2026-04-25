import { describe, expect, it } from "vitest";
import { createStudioWorkflow } from "./studio-browser-workflow.js";
import { createInitialStudioForm } from "./studio-view-model.js";

const generatedStoryBible = {
  meta: { title: "雨夜钟楼" },
  characters: [],
  clues: [],
  acts: [],
  endings: [],
};

describe("studio browser workflow", () => {
  it("backfills generated StoryBible JSON into compile draft input", async () => {
    const writes: string[] = [];
    const workflow = createStudioWorkflow({
      readForm: () => createInitialStudioForm(),
      generateStoryBible: async () => ({ storyBible: generatedStoryBible, attempts: [], criticDiagnostics: [], storyBibleDiagnostics: [] }),
      compileStoryBibleDraft: async () => ({ draftPackage: {}, flowDiagnostics: [], simulationDiagnostics: [] }),
      writeCompileSource: (value) => writes.push(value),
      renderStudioPanel: () => undefined,
      renderCreationPanel: () => undefined,
    });

    await workflow.generateStoryBible();

    expect(JSON.parse(writes[0] ?? "{}")).toEqual(generatedStoryBible);
  });


  it("surfaces compiled draft package id for the admin review handoff", async () => {
    const packageIds: string[] = [];
    const creationPanels: Array<{ diagnostics: string; output: string }> = [];
    const workflow = createStudioWorkflow({
      readForm: () => createInitialStudioForm(),
      generateStoryBible: async () => ({ storyBible: generatedStoryBible, attempts: [], criticDiagnostics: [], storyBibleDiagnostics: [] }),
      compileStoryBibleDraft: async () => ({
        draftPackage: { id: "pkg_1" },
        flowDiagnostics: [],
        simulationDiagnostics: [],
      }),
      writeCompileSource: () => undefined,
      writeAdminPackageId: (value) => packageIds.push(value),
      renderStudioPanel: () => undefined,
      renderCreationPanel: (state) => creationPanels.push(state),
    });

    await workflow.generateStoryBible();
    await workflow.compileGeneratedStoryBibleDraft();

    expect(packageIds).toEqual(["pkg_1"]);
    expect(creationPanels.at(-1)).toEqual({
      diagnostics: "Flow diagnostics 通过：未发现静态流程问题。草稿 pkg_1 已准备好。",
      output: expect.stringContaining("草稿 pkg_1"),
    });
  });

  it("renders compile draft output with readable diagnostics before raw JSON", async () => {
    const creationPanels: Array<{ diagnostics: string; output: string }> = [];
    const workflow = createStudioWorkflow({
      readForm: () => createInitialStudioForm(),
      generateStoryBible: async () => ({ storyBible: generatedStoryBible, attempts: [], criticDiagnostics: [], storyBibleDiagnostics: [] }),
      compileStoryBibleDraft: async () => ({
        draftPackage: { id: "pkg_1", title: "雨夜钟楼", packageCode: "rain_tower" },
        flowDiagnostics: [{ severity: "error", code: "missing_scene", message: "缺少场景" }],
        simulationDiagnostics: [{ severity: "warning", code: "short_path", message: "路径偏短" }],
      }),
      writeCompileSource: () => undefined,
      renderStudioPanel: () => undefined,
      renderCreationPanel: (state) => creationPanels.push(state),
    });

    await workflow.generateStoryBible();
    await workflow.compileGeneratedStoryBibleDraft();

    expect(creationPanels.at(-1)?.output).toContain("草稿 pkg_1 · 雨夜钟楼 · rain_tower");
    expect(creationPanels.at(-1)?.output).toContain("Flow diagnostics：1 条");
    expect(creationPanels.at(-1)?.output).toContain("Simulation diagnostics：1 条");
    expect(creationPanels.at(-1)?.output).toContain("原始响应 JSON");
  });

  it("compiles the latest generated StoryBible", async () => {
    const compiledSources: unknown[] = [];
    const workflow = createStudioWorkflow({
      readForm: () => createInitialStudioForm(),
      generateStoryBible: async () => ({ storyBible: generatedStoryBible, attempts: [], criticDiagnostics: [], storyBibleDiagnostics: [] }),
      compileStoryBibleDraft: async (storyBible) => {
        compiledSources.push(storyBible);
        return { draftPackage: { packageCode: "rain" }, flowDiagnostics: [], simulationDiagnostics: [] };
      },
      writeCompileSource: () => undefined,
      renderStudioPanel: () => undefined,
      renderCreationPanel: () => undefined,
    });

    await workflow.generateStoryBible();
    await workflow.compileGeneratedStoryBibleDraft();

    expect(compiledSources).toEqual([generatedStoryBible]);
  });
});
