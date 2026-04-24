import type { RuntimeState } from "@jubensha/dsl";

export interface RuntimeEventRecord {
  readonly type: "action_applied";
  readonly actionCode: string;
  readonly sceneCode: string;
}

export interface RuntimeRoomRecord {
  readonly id: string;
  readonly versionId: string;
  readonly packageCode: string;
  readonly currentSceneCode: string;
  readonly state: RuntimeState;
  readonly events: readonly RuntimeEventRecord[];
}

export interface RuntimeRepository {
  saveRoom(record: RuntimeRoomRecord): Promise<RuntimeRoomRecord>;
  listRooms(): Promise<readonly RuntimeRoomRecord[]>;
  findRoom(roomId: string): Promise<RuntimeRoomRecord | null>;
}
