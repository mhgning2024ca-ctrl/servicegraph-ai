import { createHash, randomUUID } from "node:crypto";

import {
  CreateReportResponseSchema,
  type CreateReportRequest,
  type CreateReportResponse,
} from "@servicegraph/contracts";

import type { BackendRepository } from "../../ports/backend-ports.js";
import type { OperationalEventBus } from "../../realtime/operational-event-bus.js";
import type { IdempotencyStore } from "../../shared/idempotency.js";
import { AuditService } from "../audit/audit-service.js";

export interface ReportPostProcessor {
  process(reportId: string, correlationId: string): Promise<void>;
}

export interface CreateReportCommand {
  input: CreateReportRequest;
  idempotencyKey: string;
  correlationId: string;
  citizenSubject: string | null;
}

export class ReportService {
  constructor(
    private readonly repository: BackendRepository,
    private readonly idempotency: IdempotencyStore,
    private readonly events: OperationalEventBus,
    private readonly audit: AuditService,
    private readonly postProcessor?: ReportPostProcessor,
    private readonly now = () => new Date(),
    private readonly generateId = randomUUID,
  ) {}

  create(command: CreateReportCommand): Promise<CreateReportResponse> {
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(command.input))
      .digest("hex");

    return this.idempotency.execute(
      "report.create",
      command.idempotencyKey,
      fingerprint,
      async () => {
        const createdAt = this.now().toISOString();
        const report = await this.repository.createReport({
          id: this.generateId(),
          clientReportId: command.input.clientReportId,
          createdAt,
          channel: command.input.channel,
          state: "RECEIVED",
          text: command.input.text,
          transcript: null,
          audioAssetId: null,
          serviceId: command.input.serviceId,
          areaCode: command.input.areaCode,
          latitude: command.input.latitude,
          longitude: command.input.longitude,
          symptomCodes: [],
          citizenId: command.citizenSubject,
          correlatedIncidentId: null,
          sourceLanguage: command.input.sourceLanguage,
        });
        await this.audit.record({
          correlationId: command.correlationId,
          actorSubject: command.citizenSubject,
          action: "report.created",
          entityType: "CUSTOMER_REPORT",
          entityId: report.id,
        });
        this.events.publish({
          id: this.generateId(),
          type: "report.created",
          occurredAt: createdAt,
          correlationId: command.correlationId,
          entityId: report.id,
          payload: {},
        });
        if (this.postProcessor) {
          try {
            await this.postProcessor.process(report.id, command.correlationId);
          } catch {
            await this.audit.record({
              correlationId: command.correlationId,
              actorSubject: command.citizenSubject,
              action: "report.processing.failed",
              entityType: "CUSTOMER_REPORT",
              entityId: report.id,
            });
            this.events.publish({
              id: this.generateId(),
              type: "integration.degraded",
              occurredAt: this.now().toISOString(),
              correlationId: command.correlationId,
              entityId: report.id,
              payload: { provider: "REPORT_PROCESSOR", errorCode: "PROCESSING_FAILED" },
            });
          }
        }
        const processedReport = await this.repository.findReport(report.id) ?? report;
        return CreateReportResponseSchema.parse({
          report: processedReport,
          receipt: { reportId: report.id, receivedAt: createdAt },
        });
      },
    );
  }
}
