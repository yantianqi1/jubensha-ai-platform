import { describe, expect, it } from "vitest";
import type { ScriptVersionRecord } from "../content/content-repository.js";
import { InMemoryRuntimeRepository } from "./in-memory-runtime-repository.js";
import { RuntimeConflictError, RuntimeRuleError } from "./runtime-errors.js";
import { RuntimeService } from "./runtime-service.js";

const releasedVersion: ScriptVersionRecord = {
  id: "ver_multi",
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
        private_secret: "知道港口账本藏在窗台夹层。",
      },
      {
        role_code: "doctor",
        name: "医生",
        public_profile: "曾为失踪者做过诊疗。",
        private_secret: "隐瞒了最后一次诊疗时间。",
      },
    ],
    clues: [
      {
        clue_code: "C-public",
        title: "窗台划痕",
        content: "窗台上有一道新鲜划痕。",
        initial_visibility: [{ kind: "public", value: "all" }],
        unlock_if: [],
      },
      {
        clue_code: "C-detective",
        title: "私藏账本",
        content: "账本记录了港口的秘密付款。",
        initial_visibility: [{ kind: "role", value: "detective" }],
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
            effect: [{ type: "reveal_clue", clue_code: "C-public" }],
          },
        ],
        end_if: [],
        entry_if: [],
        win_rule_hooks: [],
      },
    ],
  },
};

function createService(): RuntimeService {
  return new RuntimeService({
    repository: new InMemoryRuntimeRepository(),
    idGenerator: () => "room_multi",
    versionReader: { getReleasedVersion: async () => releasedVersion },
  });
}

describe("RuntimeService multiplayer groundwork", () => {
  it("creates deterministic seats from package roles", async () => {
    const room = await createService().createRoom({ versionId: "ver_multi", seatCount: 2 });

    expect(room.revision).toBe(0);
    expect(room.seats).toEqual([
      { seatId: "seat_1", roleCode: "detective", playerId: null, connected: false, lastSeenAt: null },
      { seatId: "seat_2", roleCode: "doctor", playerId: null, connected: false, lastSeenAt: null },
    ]);
  });

  it("rejects room creation when requested seats exceed package roles", async () => {
    await expect(
      createService().createRoom({ versionId: "ver_multi", seatCount: 3 }),
    ).rejects.toBeInstanceOf(RuntimeRuleError);
  });

  it("joins one seat and rejects duplicate joins", async () => {
    const service = createService();
    await service.createRoom({ versionId: "ver_multi", seatCount: 2 });

    const joined = await service.joinSeat("room_multi", { seatId: "seat_1", playerId: "player_a" });

    expect(joined.revision).toBe(1);
    expect(joined.seats[0]).toMatchObject({
      seatId: "seat_1",
      roleCode: "detective",
      playerId: "player_a",
      connected: true,
    });
    await expect(
      service.joinSeat("room_multi", { seatId: "seat_1", playerId: "player_b" }),
    ).rejects.toBeInstanceOf(RuntimeRuleError);
  });

  it("projects public and seat-private snapshots without leaking role secrets", async () => {
    const service = createService();
    await service.createRoom({ versionId: "ver_multi", seatCount: 2 });

    const publicSnapshot = await service.getPublicSnapshot("room_multi");
    const seatSnapshot = await service.getSeatSnapshot("room_multi", "seat_1");

    expect(publicSnapshot.revision).toBe(0);
    expect(publicSnapshot.roles[0]).toEqual({
      roleCode: "detective",
      name: "侦探",
      publicProfile: "受邀调查雾港宅邸失踪案。",
    });
    expect(JSON.stringify(publicSnapshot)).not.toContain("账本藏在窗台");
    expect(publicSnapshot.visibleClues.map((clue) => clue.clueCode)).toEqual(["C-public"]);
    expect(seatSnapshot.privateRole).toEqual({
      roleCode: "detective",
      privateSecret: "知道港口账本藏在窗台夹层。",
    });
    expect(seatSnapshot.visibleClues.map((clue) => clue.clueCode)).toEqual([
      "C-public",
      "C-detective",
    ]);
  });

  it("requires current revision before applying room actions", async () => {
    const service = createService();
    await service.createRoom({ versionId: "ver_multi", seatCount: 2 });

    const updated = await service.applyRoomAction("room_multi", {
      actionCode: "inspect_window",
      expectedRevision: 0,
    });

    expect(updated.revision).toBe(1);
    await expect(
      service.applyRoomAction("room_multi", { actionCode: "inspect_window", expectedRevision: 0 }),
    ).rejects.toBeInstanceOf(RuntimeConflictError);
  });
});
