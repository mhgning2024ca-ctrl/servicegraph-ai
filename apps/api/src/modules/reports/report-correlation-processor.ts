import { randomUUID } from "node:crypto";

import type {
  BlastRadiusSnapshot,
  CustomerReport,
  IncidentEvidence,
  IncidentSummary,
  Severity,
  TelemetrySample,
} from "@servicegraph/contracts";

import type { BackendRepository, ReportCorrelationContext } from "../../ports/backend-ports.js";
import type { OperationalEventBus } from "../../realtime/operational-event-bus.js";
import { AuditService } from "../audit/audit-service.js";
import type { ReportPostProcessor } from "./report-service.js";

/**
 * Bounded, deterministic correlation that runs after raw report persistence.
 * It deliberately relies only on persisted reports, topology and anomalous
 * telemetry; AI analysis remains an independent, optional later step.
 */
export class DeterministicReportCorrelationProcessor implements ReportPostProcessor {
  constructor(
    private readonly repository: BackendRepository,
    private readonly events: OperationalEventBus,
    private readonly audit: AuditService,
    private readonly now = () => new Date(),
    private readonly generateId = randomUUID,
  ) {}

  async process(reportId: string, correlationId: string): Promise<void> {
    const context = await this.repository.loadReportCorrelationContext(reportId);
    if (!context || context.topology.length === 0 || context.telemetry.length === 0) return;

    const occurredAt = this.now().toISOString();
    const primaryTelemetry = selectPrimaryTelemetry(context.telemetry);
    const root = context.topology.find((item) => item.nodeId === primaryTelemetry.nodeId);
    if (!root) return;

    const score = correlationScore(context);
    const relatedReports = uniqueReports([context.report, ...context.relatedReports]);
    const relatedServiceIds = unique(context.topology.map((item) => item.serviceId));
    const relatedAreaCodes = unique(relatedReports.flatMap((report) => report.areaCode ? [report.areaCode] : []));
    const existing = await this.repository.findActiveIncidentByRootNode(root.nodeId);
    const incident = existing
      ? updateIncident(existing, occurredAt, relatedReports.length, relatedServiceIds, relatedAreaCodes, root.nodeId, primaryTelemetry)
      : createIncident(this.generateId(), context, occurredAt, relatedReports.length, relatedServiceIds, relatedAreaCodes, root.nodeId, primaryTelemetry);

    if (existing) {
      await this.repository.updateIncident(incident);
    } else {
      await this.repository.createIncident(incident);
    }
    await this.repository.saveBlastRadius(createBlastRadius(
      this.generateId(), incident.id, occurredAt, incident.affectedUsersEstimate,
      relatedServiceIds, relatedAreaCodes, unique(context.topology.map((item) => item.nodeId)),
    ));

    for (const report of relatedReports) {
      await this.repository.linkReportToIncident(report.id, incident.id, score, occurredAt);
    }
    for (const evidence of createEvidence(this.generateId, incident.id, context, relatedReports)) {
      await this.repository.saveEvidence(evidence);
    }

    await this.audit.record({
      correlationId,
      actorSubject: null,
      action: existing ? "incident.updated" : "incident.created",
      entityType: "INCIDENT",
      entityId: incident.id,
      payload: { reportId: context.report.id, rootNodeId: root.nodeId },
    });
    this.events.publish({
      id: this.generateId(),
      type: existing ? "incident.updated" : "incident.created",
      occurredAt,
      correlationId,
      entityId: incident.id,
      payload: { reportId: context.report.id, rootNodeId: root.nodeId },
    });

    for (const report of relatedReports) {
      await this.audit.record({
        correlationId,
        actorSubject: null,
        action: "report.correlated",
        entityType: "CUSTOMER_REPORT",
        entityId: report.id,
        payload: { incidentId: incident.id, correlationScore: score },
      });
      this.events.publish({
        id: this.generateId(),
        type: "report.correlated",
        occurredAt,
        correlationId,
        entityId: report.id,
        payload: { incidentId: incident.id, correlationScore: score },
      });
    }
  }
}

function createIncident(
  id: string,
  context: ReportCorrelationContext,
  occurredAt: string,
  reportCount: number,
  affectedServiceIds: string[],
  affectedAreaCodes: string[],
  rootNodeId: string,
  primaryTelemetry: TelemetrySample,
): IncidentSummary {
  const root = context.topology.find((item) => item.nodeId === rootNodeId)!;
  return {
    id,
    incidentNumber: `INC-${id.slice(0, 8).toUpperCase()}`,
    title: `Correlated service disruption — ${context.report.areaCode ?? root.nodeCode}`,
    status: "DETECTED",
    severity: severityFor(primaryTelemetry),
    createdAt: occurredAt,
    updatedAt: occurredAt,
    startedAt: primaryTelemetry.observedAt,
    resolvedAt: null,
    affectedUsersEstimate: reportCount,
    affectedServiceIds,
    affectedAreaCodes,
    probableRootNodeId: rootNodeId,
    rootCauseConfidence: null,
  };
}

function updateIncident(
  incident: IncidentSummary,
  occurredAt: string,
  reportCount: number,
  affectedServiceIds: string[],
  affectedAreaCodes: string[],
  rootNodeId: string,
  primaryTelemetry: TelemetrySample,
): IncidentSummary {
  return {
    ...incident,
    updatedAt: occurredAt,
    startedAt: incident.startedAt ?? primaryTelemetry.observedAt,
    affectedUsersEstimate: Math.max(incident.affectedUsersEstimate, reportCount),
    affectedServiceIds: unique([...incident.affectedServiceIds, ...affectedServiceIds]),
    affectedAreaCodes: unique([...incident.affectedAreaCodes, ...affectedAreaCodes]),
    probableRootNodeId: rootNodeId,
    severity: higherSeverity(incident.severity, severityFor(primaryTelemetry)),
  };
}

function createBlastRadius(
  id: string,
  incidentId: string,
  createdAt: string,
  affectedUsersEstimate: number,
  affectedServiceIds: string[],
  affectedAreaCodes: string[],
  affectedNodeIds: string[],
): BlastRadiusSnapshot {
  return { id, incidentId, createdAt, affectedUsersEstimate, affectedServiceIds, affectedAreaCodes, affectedNodeIds };
}

function createEvidence(
  generateId: () => string,
  incidentId: string,
  context: ReportCorrelationContext,
  reports: readonly CustomerReport[],
): IncidentEvidence[] {
  return [
    ...reports.map((report): IncidentEvidence => ({
      id: generateId(), incidentId, type: "CUSTOMER_REPORT", sourceId: report.id,
      summary: "Customer report falls within the deterministic correlation window.",
      observedAt: report.createdAt, weight: 0.5,
    })),
    ...context.telemetry.map((sample): IncidentEvidence => ({
      id: generateId(), incidentId, type: "TELEMETRY_ANOMALY", sourceId: sample.id,
      summary: `${sample.metric} reached ${sample.value} ${sample.unit} on ${sample.nodeId}.`,
      observedAt: sample.observedAt, weight: 0.9,
    })),
    ...context.topology.map((dependency): IncidentEvidence => ({
      id: generateId(), incidentId, type: "TOPOLOGY", sourceId: dependency.nodeId,
      summary: `Service ${dependency.serviceId} depends on ${dependency.nodeCode}.`,
      observedAt: context.report.createdAt, weight: 0.8,
    })),
  ];
}

function selectPrimaryTelemetry(samples: readonly TelemetrySample[]): TelemetrySample {
  return [...samples].sort((left, right) => anomalyStrength(right) - anomalyStrength(left) ||
    left.observedAt.localeCompare(right.observedAt) || left.id.localeCompare(right.id))[0]!;
}

function anomalyStrength(sample: TelemetrySample): number {
  if (sample.metric === "PACKET_LOSS_PCT") return sample.value * 10;
  if (sample.metric === "LATENCY_MS") return sample.value;
  return 0;
}

function severityFor(sample: TelemetrySample): Severity {
  return (sample.metric === "PACKET_LOSS_PCT" && sample.value >= 15) ||
    (sample.metric === "LATENCY_MS" && sample.value >= 200) ? "CRITICAL" : "MAJOR";
}

function higherSeverity(
  left: Severity,
  right: Severity,
): Severity {
  const rank: Record<Severity, number> = { INFO: 0, MINOR: 1, MAJOR: 2, CRITICAL: 3 };
  return rank[left] >= rank[right] ? left : right;
}

function correlationScore(context: ReportCorrelationContext): number {
  return Math.min(1, 0.7 + (context.relatedReports.length > 0 ? 0.1 : 0));
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function uniqueReports(reports: readonly CustomerReport[]): CustomerReport[] {
  return [...new Map(reports.map((report) => [report.id, report])).values()];
}
