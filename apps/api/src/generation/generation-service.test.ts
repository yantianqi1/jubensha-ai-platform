import { describe, expect, it } from "vitest";
import type { RuntimeState, ScriptPackage } from "@jubensha/dsl";
import { ContentNotFoundError } from "../content/content-errors.js";
import type { ScriptVersionRecord } from "../content/content-repository.js";
import { RuntimeNotFoundError } from "../runtime/runtime-errors.js";
import type { RuntimeRoomRecord } from "../runtime/runtime-repository.js";
import { GenerationValidationError } from "./generation-errors.js";
import { GenerationService } from "./generation-service.js";
import type { ModelCompletionInput, ModelProvider } from "./model-provider.js";

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
  ],
  clues: [],
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
  revealedClues: [],
  timerExpired: false,
  phase: "interrogation",
  counters: {},
  seatCount: 1,
  npcEvents: [],
  messages: [],
  scores: { team: {}, role: {}, seat: {} },
};

const version: ScriptVersionRecord = {
  id: "ver_1",
  semver: "1.0.0",
  state: "released",
  content: scriptPackage,
};

const room: RuntimeRoomRecord = {
  id: "room_1",
  versionId: "ver_1",
  packageCode: "fog_harbor",
  currentSceneCode: "act1",
  state,
  events: [],
};

describe("GenerationService", () => {
  it("calls the injected provider with built prompt input", async () => {
    const provider = new CapturingProvider(validProviderText());
    const service = createService({ provider });

    await service.askNpc({ roomId: "room_1", npcCode: "butler", message: "你在哪里？" });

    expect(provider.lastInput?.systemPrompt).toContain("沉默的宅邸管家。");
    expect(provider.lastInput?.userPrompt).toBe("你在哪里？");
    expect(provider.lastInput?.jsonMode).toBe(true);
  });

  it("returns parsed NPC response from valid provider JSON", async () => {
    const service = createService({ provider: new CapturingProvider(validProviderText()) });

    const response = await service.askNpc({
      roomId: "room_1",
      npcCode: "butler",
      message: "说说窗台。",
    });

    expect(response.speech).toBe("我看见窗台有痕迹。");
    expect(response.proposals).toEqual([]);
  });

  it("surfaces provider schema failure as generation validation error", async () => {
    const service = createService({ provider: new CapturingProvider("not json") });

    await expect(
      service.askNpc({ roomId: "room_1", npcCode: "butler", message: "说话。" }),
    ).rejects.toBeInstanceOf(GenerationValidationError);
  });

  it("surfaces missing room from injected runtime reader", async () => {
    const service = createService({ roomRecord: null });

    await expect(
      service.askNpc({ roomId: "missing", npcCode: "butler", message: "有人吗？" }),
    ).rejects.toBeInstanceOf(RuntimeNotFoundError);
  });

  it("surfaces missing released version from injected content reader", async () => {
    const service = createService({ versionRecord: null });

    await expect(
      service.askNpc({ roomId: "room_1", npcCode: "butler", message: "有人吗？" }),
    ).rejects.toBeInstanceOf(ContentNotFoundError);
  });
});

class CapturingProvider implements ModelProvider {
  lastInput: ModelCompletionInput | undefined;

  constructor(private readonly text: string) {}

  async completeJson(input: ModelCompletionInput): Promise<string> {
    this.lastInput = input;
    return this.text;
  }
}

interface CreateServiceOptions {
  readonly provider?: ModelProvider;
  readonly roomRecord?: RuntimeRoomRecord | null;
  readonly versionRecord?: ScriptVersionRecord | null;
}

function createService(options: CreateServiceOptions = {}): GenerationService {
  return new GenerationService({
    runtimeReader: {
      async getRoom(roomId) {
        const record = options.roomRecord === undefined ? room : options.roomRecord;

        if (!record) {
          throw new RuntimeNotFoundError(`Runtime room not found: ${roomId}`);
        }

        return record;
      },
    },
    versionReader: {
      async getReleasedVersion(versionId) {
        const record = options.versionRecord === undefined ? version : options.versionRecord;

        if (!record) {
          throw new ContentNotFoundError(`Released version not found: ${versionId}`);
        }

        return record;
      },
    },
    modelProvider: options.provider ?? new CapturingProvider(validProviderText()),
  });
}

function validProviderText(): string {
  return JSON.stringify({
    speech: "我看见窗台有痕迹。",
    confidence: 0.8,
    proposals: [],
  });
}
