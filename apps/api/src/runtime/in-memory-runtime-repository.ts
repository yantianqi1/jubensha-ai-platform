import type {
  RuntimeRepository,
  RuntimeRoomRecord,
} from "./runtime-repository.js";

export class InMemoryRuntimeRepository implements RuntimeRepository {
  private readonly rooms = new Map<string, RuntimeRoomRecord>();

  async saveRoom(record: RuntimeRoomRecord): Promise<RuntimeRoomRecord> {
    this.rooms.set(record.id, record);
    return record;
  }

  async listRooms(): Promise<readonly RuntimeRoomRecord[]> {
    return [...this.rooms.values()];
  }

  async findRoom(roomId: string): Promise<RuntimeRoomRecord | null> {
    return this.rooms.get(roomId) ?? null;
  }
}
