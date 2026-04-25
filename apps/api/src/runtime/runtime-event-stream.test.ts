import { describe, expect, it } from "vitest";
import { RuntimeRuleError } from "./runtime-errors.js";
import { projectRuntimeEvents } from "./runtime-event-stream.js";
import type { RuntimeRoomRecord } from "./runtime-repository.js";

const baseRoom: RuntimeRoomRecord = {
  id: "room_1",
  versionId: "ver_1",
  packageCode: "fog_harbor",
  currentSceneCode: "act1",
  state: {
    flags: {},
    inventory: [],
    revealedClues: [],
    timerExpired: false,
    phase: "investigation",
    counters: {},
    seatCount: 2,
    npcEvents: [],
    messages: [],
    scores: { team: {}, role: {}, seat: {} },
  },
  seats: [],
  revision: 2,
  events: [
    { type: "action_applied", actionCode: "inspect_window", sceneCode: "act1" },
    { type: "action_applied", actionCode: "open_safe", sceneCode: "act1" },
  ],
};

describe("runtime event stream projection", () => {
  it("projects monotonic public event envelopes for one room", () => {
    const events = projectRuntimeEvents(baseRoom, {});

    expect(events.map((event) => event.eventId)).toEqual(["room_1:1", "room_1:2"]);
    expect(events.map((event) => event.revision)).toEqual([1, 2]);
    expect(events.every((event) => event.roomId === "room_1")).toBe(true);
    expect(events.every((event) => event.scope === "public")).toBe(true);
    expect(events[0]).toMatchObject({
      type: "action_applied",
      payload: { actionCode: "inspect_window", sceneCode: "act1" },
    });
  });

  it("returns only events after the reconnect cursor", () => {
    const events = projectRuntimeEvents(baseRoom, { afterEventId: "room_1:1" });

    expect(events.map((event) => event.eventId)).toEqual(["room_1:2"]);
  });

  it("rejects a cursor from another room explicitly", () => {
    expect(() => projectRuntimeEvents(baseRoom, { afterEventId: "room_2:1" })).toThrow(
      new RuntimeRuleError("Runtime event cursor does not belong to room: room_2:1"),
    );
  });
});
