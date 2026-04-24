import { describe, expect, it } from "vitest";
import type { RuntimeState, ScriptPackage } from "@jubensha/dsl";
import { buildNpcPrompt } from "./npc-prompt-builder.js";

const scriptPackage: ScriptPackage = {
  package_code: "fog_harbor",
  title: "雾港失踪案",
  status: "released",
  semver: "1.0.0",
  roles: [
    {
      role_code: "butler",
      name: "管家",
      public_profile: "沉默的宅邸管家。",
      private_secret: "他藏起了钥匙。",
    },
    {
      role_code: "doctor",
      name: "医生",
      public_profile: "镇上的医生。",
      private_secret: "医生知道遗嘱内容。",
    },
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
      title: "密室钥匙",
      content: "钥匙背面刻着管家的姓氏。",
      initial_visibility: [{ kind: "role", value: "butler" }],
      unlock_if: [],
    },
  ],
  scenes: [
    {
      scene_code: "act1",
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
  npcEvents: [],
  messages: [],
  scores: { team: {}, role: {}, seat: {} },
};

describe("NPC prompt builder", () => {
  it("includes selected NPC profile and private secret", () => {
    const prompt = buildNpcPrompt({
      scriptPackage,
      state,
      sceneCode: "act1",
      npcCode: "butler",
      playerMessage: "你昨晚在哪里？",
    });

    expect(prompt.systemPrompt).toContain("沉默的宅邸管家。");
    expect(prompt.systemPrompt).toContain("他藏起了钥匙。");
  });

  it("includes current scene code and phase", () => {
    const prompt = buildNpcPrompt({
      scriptPackage,
      state,
      sceneCode: "act1",
      npcCode: "butler",
      playerMessage: "现在是什么阶段？",
    });

    expect(prompt.systemPrompt).toContain("act1");
    expect(prompt.systemPrompt).toContain("interrogation");
  });

  it("includes revealed clue summaries only", () => {
    const prompt = buildNpcPrompt({
      scriptPackage,
      state,
      sceneCode: "act1",
      npcCode: "butler",
      playerMessage: "有什么线索？",
    });

    expect(prompt.systemPrompt).toContain("窗台划痕");
    expect(prompt.systemPrompt).not.toContain("密室钥匙");
  });

  it("excludes private secrets for other roles", () => {
    const prompt = buildNpcPrompt({
      scriptPackage,
      state,
      sceneCode: "act1",
      npcCode: "butler",
      playerMessage: "医生知道什么？",
    });

    expect(prompt.systemPrompt).not.toContain("医生知道遗嘱内容。");
  });

  it("requires an existing NPC role code", () => {
    expect(() =>
      buildNpcPrompt({
        scriptPackage,
        state,
        sceneCode: "act1",
        npcCode: "missing",
        playerMessage: "有人吗？",
      }),
    ).toThrow("Unknown NPC role: missing");
  });

  it("includes a strict proposals schema instruction", () => {
    const prompt = buildNpcPrompt({
      scriptPackage,
      state,
      sceneCode: "act1",
      npcCode: "butler",
      playerMessage: "你昨晚在哪里？",
    });

    expect(prompt.systemPrompt).toContain("proposals 必须是对象数组");
    expect(prompt.systemPrompt).toContain("reveal_clue 对象必须是");
    expect(prompt.systemPrompt).toContain("没有把握时，proposals 返回 []");
  });
});
