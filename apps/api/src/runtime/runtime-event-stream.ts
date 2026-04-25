import { z } from "zod";
import { RuntimeRuleError } from "./runtime-errors.js";
import type {
  RuntimeEventRecord,
  RuntimeRoomRecord,
} from "./runtime-repository.js";

export const RuntimeEventEnvelopeSchema = z.object({
  eventId: z.string().min(1),
  roomId: z.string().min(1),
  revision: z.number().int().nonnegative(),
  type: z.literal("action_applied"),
  scope: z.literal("public"),
  payload: z.object({
    actionCode: z.string().min(1),
    sceneCode: z.string().min(1),
  }),
});

export type RuntimeEventEnvelope = z.infer<typeof RuntimeEventEnvelopeSchema>;

export interface ProjectRuntimeEventsOptions {
  readonly afterEventId?: string;
}

interface RuntimeEventCursor {
  readonly roomId: string;
  readonly sequence: number;
}

export function projectRuntimeEvents(
  room: RuntimeRoomRecord,
  options: ProjectRuntimeEventsOptions,
): readonly RuntimeEventEnvelope[] {
  const cursor = parseCursor(options.afterEventId);
  assertCursorRoom(room.id, cursor, options.afterEventId);

  return room.events
    .map((event, index) => toEventEnvelope(room, event, index + 1))
    .filter((event) => isAfterCursor(event, cursor));
}

function parseCursor(afterEventId: string | undefined): RuntimeEventCursor | null {
  if (!afterEventId) {
    return null;
  }

  const [roomId, sequence] = afterEventId.split(":");
  const parsedSequence = Number(sequence);

  if (!roomId || !Number.isInteger(parsedSequence)) {
    throw new RuntimeRuleError(`Invalid runtime event cursor: ${afterEventId}`);
  }

  return { roomId, sequence: parsedSequence };
}

function assertCursorRoom(
  roomId: string,
  cursor: RuntimeEventCursor | null,
  afterEventId: string | undefined,
): void {
  if (cursor && cursor.roomId !== roomId) {
    throw new RuntimeRuleError(`Runtime event cursor does not belong to room: ${afterEventId}`);
  }
}

function toEventEnvelope(
  room: RuntimeRoomRecord,
  event: RuntimeEventRecord,
  sequence: number,
): RuntimeEventEnvelope {
  return RuntimeEventEnvelopeSchema.parse({
    eventId: `${room.id}:${sequence}`,
    roomId: room.id,
    revision: sequence,
    type: event.type,
    scope: "public",
    payload: { actionCode: event.actionCode, sceneCode: event.sceneCode },
  });
}

function isAfterCursor(
  event: RuntimeEventEnvelope,
  cursor: RuntimeEventCursor | null,
): boolean {
  return cursor === null || event.revision > cursor.sequence;
}
