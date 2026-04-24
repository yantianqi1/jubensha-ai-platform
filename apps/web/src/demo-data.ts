import type { RuntimeState, ScriptPackage } from "@jubensha/dsl";

export function createDemoPackage(): ScriptPackage {
  return {
    package_code: "fog_harbor",
    title: "雾港失踪案",
    status: "released",
    semver: "1.0.0",
    roles: [
      { role_code: "butler", name: "管家", public_profile: "沉默、守时，熟悉宅邸每一条暗道。" },
      { role_code: "doctor", name: "医生", public_profile: "镇上医生，最后一次为死者开药。" },
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
        content: "医生开的镇静剂剂量被人改过。",
        initial_visibility: [{ kind: "public", value: "all" }],
        unlock_if: [],
      },
    ],
    scenes: [
      createScene("intro", "抵达雾港", "intro"),
      createScene("search", "搜查宅邸", "investigation"),
      createScene("interrogate", "盘问众人", "interrogation"),
    ],
  };
}

export function createDemoState(): RuntimeState {
  return {
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
}

function createScene(
  sceneCode: string,
  title: string,
  phase: ScriptPackage["scenes"][number]["phase"],
): ScriptPackage["scenes"][number] {
  return {
    scene_code: sceneCode,
    title,
    phase,
    visible_to: [{ kind: "public", value: "all" }],
    actions: [],
    end_if: [{ op: "timer_expired" }],
    entry_if: [],
    win_rule_hooks: [],
  };
}
