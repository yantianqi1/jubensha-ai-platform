import type { ApiRuntimeRoom, ApiRuntimeSnapshot } from "./api-client.js";

export interface PlayBrowserWorkflowPorts {
  readonly readRoomId: () => string;
  readonly readVersionId: () => string;
  readonly readSeatCount: () => number;
  readonly readSeatId: () => string;
  readonly readPlayerId: () => string;
  readonly readActionCode: () => string;
  readonly readExpectedRevision: () => number;
  readonly createRuntimeRoom: (versionId: string, seatCount: number) => Promise<ApiRuntimeRoom>;
  readonly joinSeat: (roomId: string, seatId: string, playerId: string) => Promise<ApiRuntimeRoom>;
  readonly getPublicSnapshot: (roomId: string) => Promise<ApiRuntimeSnapshot>;
  readonly getSeatSnapshot: (roomId: string, seatId: string) => Promise<ApiRuntimeSnapshot>;
  readonly applyRoomAction: (roomId: string, actionCode: string, expectedRevision: number) => Promise<ApiRuntimeRoom>;
  readonly writeRoomId: (roomId: string) => void;
  readonly writeExpectedRevision: (revision: number) => void;
  readonly writeStatus: (message: string) => void;
  readonly writeSnapshot: (message: string) => void;
  readonly renderRoomState: (room: ApiRuntimeRoom) => void;
}

export function createPlayBrowserWorkflow(ports: PlayBrowserWorkflowPorts) {
  return {
    createRuntimeRoom: () => createRuntimeRoom(ports),
    joinSeat: () => joinSeat(ports),
    readPublicSnapshot: () => readPublicSnapshot(ports),
    readSeatSnapshot: () => readSeatSnapshot(ports),
    applyRoomAction: () => applyRoomAction(ports),
  };
}

async function createRuntimeRoom(ports: PlayBrowserWorkflowPorts): Promise<void> {
  const versionId = ports.readVersionId();

  if (!versionId) {
    ports.writeStatus("请输入 versionId 后创建运行房间。");
    return;
  }

  await updateRoom({
    action: () => ports.createRuntimeRoom(versionId, ports.readSeatCount()),
    success: "运行房间已创建",
    ports,
  });
}

async function joinSeat(ports: PlayBrowserWorkflowPorts): Promise<void> {
  const input = readSeatInput(ports);

  if (!input) {
    ports.writeStatus("请输入 roomId、seatId 和 playerId 后入座。");
    return;
  }

  await updateRoom({
    action: () => ports.joinSeat(input.roomId, input.seatId, input.playerId),
    success: `已入座 ${input.seatId}`,
    ports,
  });
}

async function readPublicSnapshot(ports: PlayBrowserWorkflowPorts): Promise<void> {
  const roomId = ports.readRoomId();

  if (!roomId) {
    ports.writeStatus("请输入 roomId 后读取公开快照。");
    return;
  }

  await renderSnapshot(() => ports.getPublicSnapshot(roomId), ports);
}

async function readSeatSnapshot(ports: PlayBrowserWorkflowPorts): Promise<void> {
  const input = readSeatSnapshotInput(ports);

  if (!input) {
    ports.writeStatus("请输入 roomId 和 seatId 后读取座位快照。");
    return;
  }

  await renderSnapshot(() => ports.getSeatSnapshot(input.roomId, input.seatId), ports);
}

async function applyRoomAction(ports: PlayBrowserWorkflowPorts): Promise<void> {
  const input = readActionInput(ports);

  if (!input) {
    ports.writeStatus("请输入 roomId 和 actionCode 后提交动作。");
    return;
  }

  await updateRoom({
    action: () => ports.applyRoomAction(input.roomId, input.actionCode, input.expectedRevision),
    success: `动作 ${input.actionCode} 已提交`,
    ports,
  });
}

async function updateRoom(options: {
  readonly action: () => Promise<ApiRuntimeRoom>;
  readonly success: string;
  readonly ports: PlayBrowserWorkflowPorts;
}): Promise<void> {
  try {
    const room = await options.action();
    options.ports.writeRoomId(room.id);
    options.ports.writeExpectedRevision(room.revision);
    options.ports.renderRoomState(room);
    options.ports.writeStatus(`${options.success}，revision ${room.revision}`);
  } catch (error) {
    options.ports.writeStatus(readError(error));
  }
}

async function renderSnapshot(
  readSnapshot: () => Promise<ApiRuntimeSnapshot>,
  ports: PlayBrowserWorkflowPorts,
): Promise<void> {
  try {
    const snapshot = await readSnapshot();
    ports.writeExpectedRevision(snapshot.revision);
    ports.writeSnapshot(JSON.stringify(snapshot, null, 2));
    ports.writeStatus(`快照已读取，revision ${snapshot.revision}`);
  } catch (error) {
    ports.writeStatus(readError(error));
  }
}

function readSeatInput(ports: PlayBrowserWorkflowPorts) {
  const roomId = ports.readRoomId();
  const seatId = ports.readSeatId();
  const playerId = ports.readPlayerId();
  return roomId && seatId && playerId ? { roomId, seatId, playerId } : null;
}

function readSeatSnapshotInput(ports: PlayBrowserWorkflowPorts) {
  const roomId = ports.readRoomId();
  const seatId = ports.readSeatId();
  return roomId && seatId ? { roomId, seatId } : null;
}

function readActionInput(ports: PlayBrowserWorkflowPorts) {
  const roomId = ports.readRoomId();
  const actionCode = ports.readActionCode();
  const expectedRevision = ports.readExpectedRevision();
  return roomId && actionCode ? { roomId, actionCode, expectedRevision } : null;
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
