export type AuditActorType = "operator" | "player" | "system";
export type AuditEventStatus = "succeeded" | "failed";

export interface AuditActor {
  readonly actorId: string;
  readonly actorType: AuditActorType;
}

export interface AuditEventRecord {
  readonly id: string;
  readonly action: string;
  readonly actor: AuditActor;
  readonly targetType: string;
  readonly targetId: string;
  readonly status: AuditEventStatus;
  readonly requestId?: string;
  readonly errorCode?: string;
  readonly createdAt: string;
}

export interface AuditEventInput {
  readonly action: string;
  readonly actor: AuditActor;
  readonly targetType: string;
  readonly targetId: string;
  readonly status: AuditEventStatus;
  readonly requestId?: string;
  readonly errorCode?: string;
}

export interface ListAuditEventsInput {
  readonly targetType?: string;
  readonly targetId?: string;
}
