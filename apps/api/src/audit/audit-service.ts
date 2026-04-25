import type { AuditActor, AuditEventInput, AuditEventRecord, ListAuditEventsInput } from "./audit-event.js";
import type { AuditRepository } from "./audit-repository.js";

export interface AuditServiceOptions {
  readonly repository: AuditRepository;
  readonly idGenerator: () => string;
  readonly now: () => string;
}

export class AuditService {
  private readonly repository: AuditRepository;
  private readonly idGenerator: () => string;
  private readonly now: () => string;

  constructor(options: AuditServiceOptions) {
    this.repository = options.repository;
    this.idGenerator = options.idGenerator;
    this.now = options.now;
  }

  async record(input: AuditEventInput): Promise<AuditEventRecord> {
    return this.repository.saveEvent({ ...input, id: this.idGenerator(), createdAt: this.now() });
  }

  async listEvents(input: ListAuditEventsInput): Promise<readonly AuditEventRecord[]> {
    return this.repository.listEvents(input);
  }
}

export function systemActor(): AuditActor {
  return { actorId: "system", actorType: "system" };
}
