import { describe, expect, it } from "vitest";
import type { RuntimeState, ScriptPackage } from "@jubensha/dsl";
import { buildInvestigationViewModel } from "./investigation-view-model.js";

const scriptPackage: ScriptPackage = {
  package_code: "fog_harbor",
  title: "雾港失踪案",
  status: "released",
  semver: "1.0.0",
  roles: [
    { role_code: "butler", name: "管家", public_profile: "总在宅邸边缘徘徊。" },
    { role_code: "doctor", name: "医生", public_profile: "最后见过死者的人。" },
  ],
  clues: [
    {
      clue_code: "C-01",
      title: "窗台划痕",
      content: "窗台上有一道新鲜划痕，管家曾在附近徘徊。",
      initial_visibility: [{ kind: "public", value: "all" }],
      unlock_if: [],
    },
    {
      clue_code: "C-02",
      title: "诊疗记录",
      content: "记录显示死者夜里服过镇静剂。",
      initial_visibility: [{ kind: "role", value: "doctor" }],
      unlock_if: [],
    },
  ],
  scenes: [
    {
      scene_code: "intro",
      title: "抵达雾港",
      phase: "intro",
      visible_to: [{ kind: "public", value: "all" }],
      actions: [],
      end_if: [{ op: "timer_expired" }],
      entry_if: [],
      win_rule_hooks: [],
    },
    {
      scene_code: "interrogate",
      title: "盘问管家",
      phase: "interrogation",
      visible_to: [{ kind: "public", value: "all" }],
      actions: [],
      end_if: [{ op: "timer_expired" }],
      entry_if: [],
      win_rule_hooks: [],
    },
  ],
};

const state: RuntimeState = {
  flags: {},
  inventory: [],
  revealedClues: ["C-01"],
  timerExpired: false,
  phase: "interrogation",
  counters: {},
  seatCount: 1,
  npcEvents: [
    { npcCode: "doctor", event: "承认见过死者" },
    { npcCode: "butler", event: "回避窗台问题" },
  ],
  messages: [],
  scores: { team: {}, role: {}, seat: {} },
};

describe("investigation view model", () => {
  it("marks revealed clues for the clue board", () => {
    const model = buildInvestigationViewModel(scriptPackage, state);

    expect(model.clueBoard.map((clue) => [clue.code, clue.revealed])).toEqual([
      ["C-01", true],
      ["C-02", false],
    ]);
  });

  it("orders timeline entries by scene then NPC events", () => {
    const model = buildInvestigationViewModel(scriptPackage, state);

    expect(model.timeline.map((entry) => entry.label)).toEqual([
      "抵达雾港",
      "盘问管家",
      "医生：承认见过死者",
      "管家：回避窗台问题",
    ]);
  });

  it("counts suspect evidence from clue content and NPC events", () => {
    const model = buildInvestigationViewModel(scriptPackage, state);

    expect(model.suspects).toEqual([
      expect.objectContaining({ code: "butler", evidenceCount: 2 }),
      expect.objectContaining({ code: "doctor", evidenceCount: 1 }),
    ]);
  });

  it("summarizes the active phase", () => {
    const model = buildInvestigationViewModel(scriptPackage, state);

    expect(model.activePhase).toEqual({ phase: "interrogation", label: "盘问阶段" });
  });
});
