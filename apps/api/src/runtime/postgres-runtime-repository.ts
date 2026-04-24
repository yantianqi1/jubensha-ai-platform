import type { Pool } from "pg";
import type {
  RuntimeEventRecord,
  RuntimeRepository,
  RuntimeRoomRecord,
} from "./runtime-repository.js";

interface RuntimeRoomRow {
  readonly id: string;
  readonly version_id: string;
  readonly package_code: string;
  readonly current_scene_code: string;
  readonly state: RuntimeRoomRecord["state"];
  readonly events: readonly RuntimeEventRecord[];
}

export class PostgresRuntimeRepository implements RuntimeRepository {
  constructor(private readonly pool: Pool) {}

  async saveRoom(record: RuntimeRoomRecord): Promise<RuntimeRoomRecord> {
    await this.pool.query(
      `
      INSERT INTO runtime_rooms (
        id,
        version_id,
        package_code,
        current_scene_code,
        state,
        events
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
      ON CONFLICT (id) DO UPDATE
      SET version_id = EXCLUDED.version_id,
          package_code = EXCLUDED.package_code,
          current_scene_code = EXCLUDED.current_scene_code,
          state = EXCLUDED.state,
          events = EXCLUDED.events,
          updated_at = now()
      `,
      [
        record.id,
        record.versionId,
        record.packageCode,
        record.currentSceneCode,
        JSON.stringify(record.state),
        JSON.stringify(record.events),
      ],
    );

    return record;
  }

  async findRoom(roomId: string): Promise<RuntimeRoomRecord | null> {
    const result = await this.pool.query<RuntimeRoomRow>(
      `
      SELECT id, version_id, package_code, current_scene_code, state, events
      FROM runtime_rooms
      WHERE id = $1
      `,
      [roomId],
    );
    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return buildRoomRecord(row);
  }

  async listRooms(): Promise<readonly RuntimeRoomRecord[]> {
    const result = await this.pool.query<RuntimeRoomRow>(
      `
      SELECT id, version_id, package_code, current_scene_code, state, events
      FROM runtime_rooms
      ORDER BY created_at ASC, id ASC
      `,
    );

    return result.rows.map(buildRoomRecord);
  }
}

function buildRoomRecord(row: RuntimeRoomRow): RuntimeRoomRecord {
  return {
    id: row.id,
    versionId: row.version_id,
    packageCode: row.package_code,
    currentSceneCode: row.current_scene_code,
    state: row.state,
    events: row.events,
  };
}
