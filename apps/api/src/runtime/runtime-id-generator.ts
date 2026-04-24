import { randomUUID } from "node:crypto";

export type RuntimeIdGenerator = () => string;

const ROOM_ID_PREFIX = "room_";
const INITIAL_SEQUENCE = 1;

export function createSequentialRuntimeIdGenerator(): RuntimeIdGenerator {
  let nextRoomId = INITIAL_SEQUENCE;

  return () => {
    const id = `${ROOM_ID_PREFIX}${nextRoomId}`;
    nextRoomId += 1;
    return id;
  };
}

export function createRandomRuntimeIdGenerator(): RuntimeIdGenerator {
  return () => `${ROOM_ID_PREFIX}${randomUUID()}`;
}
