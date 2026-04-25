import type { AuditEventRecord, ListAuditEventsInput } from "./audit-event.js";

export interface AuditRepository {
  saveEvent(event: AuditEventRecord): Promise<AuditEventRecord>;
  listEvents(input: ListAuditEventsInput): Promise<readonly AuditEventRecord[]>;
}

export class InMemoryAuditRepository implements AuditRepository {
  private readonly events: AuditEventRecord[] = [];

  async saveEvent(event: AuditEventRecord): Promise<AuditEventRecord> {
    this.events.push(event);
    return event;
  }

  async listEvents(input: ListAuditEventsInput): Promise<readonly AuditEventRecord[]> {
    return this.events.filter((event) => matchesTarget(event, input));
  }
}

function matchesTarget(event: AuditEventRecord, input: ListAuditEventsInput): boolean {
  if (input.targetType && event.targetType !== input.targetType) {
    return false;
  }

  if (input.targetId && event.targetId !== input.targetId) {
    return false;
  }

  return true;
}
