import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { renderScriptCreationJobPage } from "./script-creation-job-page.js";
import { scriptCreationJobMockStates } from "./script-creation-job-demo.js";
import { renderInvestigationPage } from "./template.js";
import type { InvestigationViewModel } from "./investigation-view-model.js";

const model: InvestigationViewModel = {
  title: "雾港失踪案",
  activePhase: { phase: "interrogation", label: "盘问阶段" },
  clueBoard: [],
  timeline: [],
  suspects: [],
};

describe("script creation job page", () => {
  it("renders every required reusable component shell", () => {
    const html = renderScriptCreationJobPage(scriptCreationJobMockStates.ready_for_review);

    expect(html).toContain('data-component="ProgressHero"');
    expect(html).toContain('data-component="PipelineStepper"');
    expect(html).toContain('data-component="StatusBadge"');
    expect(html).toContain('data-component="ActiveStageSummary"');
    expect(html).toContain('data-component="ResultSections"');
    expect(html).toContain('data-component="OverviewMetrics"');
    expect(html).toContain('data-component="ActivityLogPanel"');
    expect(html).toContain('data-component="StoryBibleCard"');
    expect(html).toContain('data-component="CriticReviewCard"');
    expect(html).toContain('data-component="DraftPackageCard"');
    expect(html).toContain('data-component="QualityReportCard"');
    expect(html).toContain('data-component="SuccessState"');
  });

  it("renders compact empty state instead of multiple large result cards", () => {
    const html = renderScriptCreationJobPage();

    expect(html).toContain('class="job-empty-state"');
    expect(html).toContain("等待 generation job");
    expect(html).not.toContain('class="result-grid"');
    expect(html).not.toContain('data-component="Skeleton"');
  });

  it("keeps raw job JSON behind a closed advanced section", () => {
    const html = renderScriptCreationJobPage(scriptCreationJobMockStates.ready_for_review);
    const rawIndex = html.indexOf("Advanced / Raw JSON");
    const rawPayloadIndex = html.indexOf('data-component="RawJobSummary"');
    const openingDetails = html.lastIndexOf("<details", rawPayloadIndex);

    expect(rawIndex).toBeGreaterThan(-1);
    expect(rawPayloadIndex).toBeGreaterThan(rawIndex);
    expect(html.slice(openingDetails, rawPayloadIndex)).not.toContain("open");
  });

  it("has exactly one primary creation CTA in the studio main flow", () => {
    const html = renderInvestigationPage(model, "studio-web");
    const primaryCtaCount = html.match(/class="button-primary" data-action="script-job-create-run"/g)?.length ?? 0;

    expect(primaryCtaCount).toBe(1);
    expect(html).toContain("创建并运行生成任务");
  });

  it("keeps the loaded job region labelled without duplicating script-job-title", () => {
    const html = renderScriptCreationJobPage(scriptCreationJobMockStates.ready_for_review);
    const titleIdCount = html.match(/id="script-job-title"/g)?.length ?? 0;

    expect(titleIdCount).toBe(1);
    expect(html).toContain('aria-labelledby="script-job-title"');
    expect(html).toContain('<h3 id="script-job-title">Script Creation Job</h3>');
  });

  it("keeps load and advanced job actions out of the primary style", () => {
    const html = renderInvestigationPage(model, "studio-web");

    expect(html).toContain('class="button-secondary button-compact" data-action="script-job-load"');
    expect(html).toContain('class="button-ghost button-compact" data-action="retry-story-bible"');
    expect(html).toContain('class="button-ghost button-compact" data-action="compile-story-bible"');
    expect(html).not.toContain('class="button-primary" data-action="script-job-load"');
    expect(html).not.toContain('class="button-primary" data-action="retry-story-bible"');
    expect(html).not.toContain('class="button-primary" data-action="compile-story-bible"');
  });

  it("keeps advanced legacy tools collapsed and visually muted", () => {
    const html = renderInvestigationPage(model, "studio-web");
    const legacyIndex = html.indexOf('class="legacy-tools panel panel-debug"');
    const summaryIndex = html.indexOf("Advanced / Legacy tools");

    expect(legacyIndex).toBeGreaterThan(-1);
    expect(summaryIndex).toBeGreaterThan(legacyIndex);
    expect(html.slice(legacyIndex, summaryIndex)).not.toContain("open");
  });

  it("keeps all mock script creation states isolated in demo data", () => {
    const states = Object.keys(scriptCreationJobMockStates);

    expect(states).toEqual([
      "queued",
      "received_brief",
      "planning_story",
      "criticizing_story",
      "compiling_draft",
      "deterministic_review",
      "ready_for_review",
      "blocked",
      "failed",
    ]);
  });

  it("renders blocked and failed states with explicit diagnostics", () => {
    const blocked = renderScriptCreationJobPage(scriptCreationJobMockStates.blocked);
    const failed = renderScriptCreationJobPage(scriptCreationJobMockStates.failed);

    expect(blocked).toContain('data-state="blocked"');
    expect(blocked).toContain("readyForPublish=false");
    expect(blocked).toContain("deterministic_error");
    expect(failed).toContain('data-state="failed"');
    expect(failed).toContain("provider_schema_error");
  });

  it("mounts the page on the studio surface without backend wiring", () => {
    const html = renderInvestigationPage(model, "studio-web");

    expect(html).toContain('data-script-creation-live="polling"');
    expect(html).toContain("Script Creation Job");
    expect(html).toContain('data-action="script-job-load"');
    expect(html).toContain('data-action="script-job-create-run"');
  });

  it("renders compact placeholder before a real job is loaded", () => {
    const html = renderScriptCreationJobPage();

    expect(html).toContain('data-component="EmptyState"');
    expect(html).toContain('data-script-job-content');
  });

  it("includes reduced motion support for job animations", () => {
    const css = readFileSync(resolve("src/script-creation-job.css"), "utf8");

    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain(".job-progress-fill");
    expect(css).toContain("active-step-pulse");
  });

  it("defines compact job density and lower-emphasis raw styling", () => {
    const css = readFileSync(resolve("src/script-creation-job.css"), "utf8");

    expect(css).toContain("height: 6px");
    expect(css).toContain(".result-section:last-child");
    expect(css).toContain("border-style: dashed");
  });
});
