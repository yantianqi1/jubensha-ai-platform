import { describe, expect, it } from "vitest";
import type { ScriptVersionRecord } from "../content/content-repository.js";
import { InMemoryRuntimeRepository } from "./in-memory-runtime-repository.js";
import { RuntimeNotFoundError, RuntimeRuleError } from "./runtime-errors.js";
import { RuntimeService } from "./runtime-service.js";
import type { RuntimeRepository } from "./runtime-repository.js";

const releasedVersion: ScriptVersionRecord = {
  id: "ver_1",
  semver: "1.0.0",
  state: "released",
  content: {
    package_code: "fog_harbor",
    title: "雾港失踪案",
    status: "released",
    semver: "1.0.0",
    roles: [
      {
        role_code: "detective",
        name: "侦探",
        public_profile: "受邀调查雾港宅邸失踪案。",
      },
    ],
    clues: [
      {
        clue_code: "C-01",
        title: "窗台划痕",
        content: "窗台上有一道新鲜划痕。",
        initial_visibility: [{ kind: "public", value: "all" }],
        unlock_if: [],
      },
    ],
    scenes: [
      {
        scene_code: "act1",
        phase: "investigation",
        visible_to: [{ kind: "public", value: "all" }],
        actions: [
          {
            code: "inspect_window",
            allow_if: [],
            effect: [{ type: "reveal_clue", clue_code: "C-01" }],
          },
          {
            code: "call_vote",
            allow_if: [{ op: "clue_revealed", clue_code: "C-01" }],
            effect: [{ type: "advance_phase", to: "vote" }],
          },
        ],
        end_if: [{ op: "timer_expired" }],
        entry_if: [],
        win_rule_hooks: [],
      },
    ],
  },
};

function createService(
  version = releasedVersion,
  repository: RuntimeRepository = new InMemoryRuntimeRepository(),
): RuntimeService {
  return new RuntimeService({
    repository,
    idGenerator: () => "room_1",
    versionReader: {
      getReleasedVersion: async () => version,
    },
  });
}

describe("RuntimeService", () => {
  it("creates a room from a released script version", async () => {
    const service = createService();

    const room = await service.createRoom({ versionId: "ver_1", seatCount: 3 });

    expect(room.id).toBe("room_1");
    expect(room.versionId).toBe("ver_1");
    expect(room.currentSceneCode).toBe("act1");
    expect(room.state.phase).toBe("investigation");
    expect(room.state.seatCount).toBe(3);
    await expect(service.getRoom("room_1")).resolves.toEqual(room);
  });

  it("lists runtime rooms", async () => {
    const service = createService();
    const room = await service.createRoom({ versionId: "ver_1", seatCount: 3 });

    await expect(service.listRooms()).resolves.toEqual([room]);
  });

  it("executes an available scene action and stores an audit event", async () => {
    const service = createService();
    await service.createRoom({ versionId: "ver_1", seatCount: 3 });

    const room = await service.applyRoomAction("room_1", "inspect_window");

    expect(room.state.revealedClues).toEqual(["C-01"]);
    expect(room.events).toEqual([
      {
        type: "action_applied",
        actionCode: "inspect_window",
        sceneCode: "act1",
      },
    ]);
  });

  it("replays stored events to rebuild persisted room state", async () => {
    const repository = new InMemoryRuntimeRepository();
    const service = createService(releasedVersion, repository);
    const created = await service.createRoom({ versionId: "ver_1", seatCount: 3 });
    const applied = await service.applyRoomAction("room_1", "inspect_window");

    await repository.saveRoom({ ...applied, state: created.state });

    const replayed = await service.replayRoom("room_1");

    expect(replayed.state.revealedClues).toEqual(["C-01"]);
    await expect(service.getRoom("room_1")).resolves.toEqual(replayed);
  });

  it("throws explicit rule error when an action is unavailable", async () => {
    const service = createService();
    await service.createRoom({ versionId: "ver_1", seatCount: 3 });

    await expect(service.applyRoomAction("room_1", "call_vote")).rejects.toBeInstanceOf(
      RuntimeRuleError,
    );
  });

  it("throws explicit not found error for missing rooms", async () => {
    const service = createService();

    await expect(service.getRoom("missing_room")).rejects.toBeInstanceOf(RuntimeNotFoundError);
  });
});
