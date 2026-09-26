import type { IncidentSummary } from "@servicegraph/contracts";

import type {
  BackendRepository,
  IncidentAnalysisAdapter,
  IncidentAnalysisResult,
} from "../../ports/backend-ports.js";
import type { OperationalEventBus } from "../../realtime/operational-event-bus.js";
import { ApiError } from "../../shared/api-error.js";
import { AuditService } from "../audit/audit-service.js";

export class IncidentAnalysisOrchestrator {
  constructor(
    private readonly repository: BackendRepository,
    private readonly adapter: IncidentAnalysisAdapter,
    private readonly events: OperationalEventBus,
    private readonly audit: AuditService,
  ) {}

  async analyze(
    incident: IncidentSummary,
    correlationId: string,
    actorSubject: string,
  ): Promise<IncidentAnalysisResult> {
    const result = await this.adapter.analyze(incident.id, correlationId);
    if (!result.ok) {
      this.events.publish({
        id: crypto.randomUUID(),
        type: "integration.degraded",
        occurredAt: new Date().toISOString(),
        correlationId,
        entityId: incident.id,
        payload: { provider: result.provider, errorCode: result.errorCode ?? "UNAVAILABLE" },
      });
      throw new ApiError({
        code: "SERVICE_UNAVAILABLE",
        statusCode: 503,
        message: "Incident analysis is currently unavailable.",
      });
    }

    await this.repository.saveHypothesis(result.data.hypothesis);
    await this.repository.saveBlastRadius(result.data.blastRadius);
    await this.audit.record({
      correlationId,
      actorSubject,
      action: "hypothesis.created",
      entityType: "INCIDENT",
      entityId: incident.id,
      payload: { provider: result.provider },
    });
    this.events.publish({
      id: crypto.randomUUID(),
      type: "hypothesis.created",
      occurredAt: result.data.hypothesis.createdAt,
      correlationId,
      entityId: result.data.hypothesis.id,
      payload: {},
    });
    return result.data;
  }
}
