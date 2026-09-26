import { randomUUID } from "node:crypto";

import type { BackendRepository } from "../../ports/backend-ports.js";

export interface AuditInput {
  correlationId: string;
  actorSubject: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  payload?: Record<string, unknown>;
}

export class AuditService {
  constructor(
    private readonly repository: BackendRepository,
    private readonly now = () => new Date(),
    private readonly generateId = randomUUID,
  ) {}

  async record(input: AuditInput): Promise<void> {
    await this.repository.appendAudit({
      id: this.generateId(),
      createdAt: this.now().toISOString(),
      correlationId: input.correlationId,
      actorSubject: input.actorSubject,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload ?? {},
    });
  }
}
