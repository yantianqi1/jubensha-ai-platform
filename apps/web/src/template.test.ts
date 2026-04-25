import { describe, expect, it } from "vitest";
import type { InvestigationViewModel } from "./investigation-view-model.js";
import { renderInvestigationPage } from "./template.js";

const model: InvestigationViewModel = {
  title: "雾港失踪案",
  activePhase: { phase: "interrogation", label: "盘问阶段" },
  clueBoard: [],
  timeline: [],
  suspects: [],
};

describe("investigation template", () => {
  it("renders playable API controls", () => {
    const html = renderInvestigationPage(model);

    expect(html).toContain('data-surface-shell="play-web"');
    expect(html).toContain('data-surface-nav');
    expect(html).toContain('data-surface-link="studio-web"');
    expect(html).toContain('data-surface-panel="play-web"');
    expect(html).toContain('data-surface-panel="admin-web"');
    expect(html).toContain("data-action=\"start-demo\"");
    expect(html).toContain("data-action=\"ask-npc\"");
    expect(html).toContain('data-action="create-runtime-room"');
    expect(html).toContain('data-action="join-seat"');
    expect(html).toContain('data-action="read-public-snapshot"');
    expect(html).toContain('data-action="read-seat-snapshot"');
    expect(html).toContain('data-action="apply-room-action"');
    expect(html).toContain("data-runtime-snapshot");
    expect(html).toContain("data-shadow-status");
  });

  it("renders story bible compile draft controls", () => {
    const html = renderInvestigationPage(model);

    expect(html).toContain("data-story-bible-input");
    expect(html).toContain("data-action=\"compile-story-bible\"");
    expect(html).toContain("data-creation-diagnostics");
    expect(html).toContain("data-creation-output");
  });

  it("renders studio generation controls", () => {
    const html = renderInvestigationPage(model);

    expect(html).toContain("data-studio-field=\"genre\"");
    expect(html).toContain("data-studio-field=\"playerCount\"");
    expect(html).toContain("data-studio-field=\"premise\"");
    expect(html).toContain("data-action=\"generate-story-bible\"");
    expect(html).toContain("data-action=\"retry-story-bible\"");
    expect(html).toContain("data-action=\"compile-generated-story-bible\"");
    expect(html).toContain("data-studio-relations");
    expect(html).toContain("data-studio-diff");
    expect(html).toContain("data-studio-skeleton-state");
    expect(html).toContain("data-studio-skeleton-editor");
    expect(html).toContain('class="readable-output" data-studio-attempts');
    expect(html).toContain('class="readable-output" data-creation-output');
  });

  it("renders admin publish review and asset job controls", () => {
    const html = renderInvestigationPage(model, "admin-web");

    expect(html).toContain('data-surface-shell="admin-web"');
    expect(html).toContain('data-admin-field="packageId"');
    expect(html).toContain('data-action="fetch-publish-review"');
    expect(html).toContain('data-admin-field="semver"');
    expect(html).toContain('data-action="publish-draft"');
    expect(html).toContain("等待显式发布");
    expect(html).toContain("data-admin-readiness");
    expect(html).toContain("data-admin-blockers");
    expect(html).toContain("data-admin-golden-regression");
    expect(html).toContain('data-admin-field="assetJobId"');
    expect(html).toContain('data-action="inspect-asset-job"');
    expect(html).toContain('data-action="run-asset-job"');
    expect(html).toContain("不假设生成完成");
  });
});
