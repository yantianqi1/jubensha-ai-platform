import type { Pool } from "pg";
import type { AuditEventRecord, ListAuditEventsInput } from "./audit-event.js";
import type { AuditRepository } from "./audit-repository.js";

interface AuditEventRow {
  readonly id: string;
  readonly action: string;
  readonly actor_id: string;
  readonly actor_type: string;
  readonly target_type: string;
  readonly target_id: string;
  readonly status: string;
  readonly request_id: string | null;
  readonly error_code: string | null;
  readonly created_at: string;
}

export class PostgresAuditRepository implements AuditRepository {
  constructor(private readonly pool: Pool) {}

  async saveEvent(event: AuditEventRecord): Promise<AuditEventRecord> {
    await this.pool.query(
      `
      INSERT INTO audit_events (id, action, actor_id, actor_type, target_type, target_id, status, request_id, error_code, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        event.id,
        event.action,
        event.actor.actorId,
        event.actor.actorType,
        event.targetType,
        event.targetId,
        event.status,
        event.requestId ?? null,
        event.errorCode ?? null,
        event.createdAt,
      ],
    );

    return event;
  }

  async listEvents(input: ListAuditEventsInput): Promise<readonly AuditEventRecord[]> {
    const result = await this.pool.query<AuditEventRow>(
      `
      SELECT id, action, actor_id, actor_type, target_type, target_id, status, request_id, error_code, created_at
      FROM audit_events
      WHERE ($1::text IS NULL OR target_type = $1)
        AND ($2::text IS NULL OR target_id = $2)
      ORDER BY created_at DESC, id DESC
      `,
      [input.targetType ?? null, input.targetId ?? null],
    );

    return result.rows.map(toAuditEventRecord);
  }
}

function toAuditEventRecord(row: AuditEventRow): AuditEventRecord {
  return {
    id: row.id,
    action: row.action,
    actor: { actorId: row.actor_id, actorType: row.actor_type as AuditEventRecord["actor"]["actorType"] },
    targetType: row.target_type,
    targetId: row.target_id,
    status: row.status as AuditEventRecord["status"],
    ...(row.request_id ? { requestId: row.request_id } : {}),
    ...(row.error_code ? { errorCode: row.error_code } : {}),
    createdAt: row.created_at,
  };
}
