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

    expect(html).toContain("data-action=\"start-demo\"");
    expect(html).toContain("data-action=\"ask-npc\"");
    expect(html).toContain("data-shadow-status");
  });
});
