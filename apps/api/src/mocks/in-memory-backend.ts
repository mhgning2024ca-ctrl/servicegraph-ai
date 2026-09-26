import type {
  ApprovalDecision,
  BlastRadiusSnapshot,
  CustomerCommunication,
  CustomerReport,
  IncidentEvidence,
  IncidentGraph,
  IncidentSummary,
  RemediationExecution,
  RemediationProposal,
  RootCauseHypothesis,
  VerificationSnapshot,
} from "@servicegraph/contracts";
import type { TelemetrySample } from "@servicegraph/contracts";

import type {
  AuditEventInput,
  BackendRepository,
  CorrelationTopologyDependency,
  IncidentListFilter,
  IntegrationHealthRecord,
  ReportCorrelationContext,
  TelemetryStore,
} from "../ports/backend-ports.js";

export class InMemoryBackendRepository implements BackendRepository, TelemetryStore {
  readonly reports = new Map<string, CustomerReport>();
  readonly graphs = new Map<string, IncidentGraph>();
  readonly incidents = new Map<string, IncidentSummary>();
  readonly evidence = new Map<string, IncidentEvidence>();
  readonly hypotheses = new Map<string, RootCauseHypothesis>();
  readonly blastRadii = new Map<string, BlastRadiusSnapshot>();
  readonly proposals = new Map<string, RemediationProposal>();
  readonly decisions = new Map<string, ApprovalDecision>();
  readonly executions = new Map<string, RemediationExecution>();
  readonly verifications = new Map<string, VerificationSnapshot>();
  readonly communications = new Map<string, CustomerCommunication>();
  readonly integrationHealth = new Map<string, IntegrationHealthRecord>();
  readonly auditEvents: AuditEventInput[] = [];
  readonly telemetrySamples = new Map<string, TelemetrySample>();
  readonly topologyDependencies: CorrelationTopologyDependency[] = [];
  readonly reportCorrelations = new Map<string, { incidentId: string; score: number }>();

  constructor(private ready = true) {}

  async isReady(): Promise<boolean> {
    return this.ready;
  }

  setReady(ready: boolean): void {
    this.ready = ready;
  }

  async createReport(report: CustomerReport): Promise<CustomerReport> {
    this.reports.set(report.id, report);
    return report;
  }

  async findReport(reportId: string): Promise<CustomerReport | null> {
    return this.reports.get(reportId) ?? null;
  }

  async loadReportCorrelationContext(reportId: string): Promise<ReportCorrelationContext | null> {
    const report = await this.findReport(reportId);
    if (!report) return null;
    const referenceAt = new Date(report.createdAt).getTime();
    const inWindow = (value: string) => Math.abs(new Date(value).getTime() - referenceAt) <= 30 * 60_000;
    const topology = this.topologyDependencies.filter((dependency) =>
      dependency.serviceId === report.serviceId ||
      (report.serviceId === null && dependency.areaCode === report.areaCode),
    );
    const nodeIds = new Set(topology.map((dependency) => dependency.nodeId));
    return {
      report,
      relatedReports: [...this.reports.values()].filter((candidate) =>
        candidate.id !== report.id &&
        inWindow(candidate.createdAt) &&
        ((report.serviceId !== null && candidate.serviceId === report.serviceId) ||
          (report.areaCode !== null && candidate.areaCode === report.areaCode)),
      ),
      topology,
      telemetry: [...this.telemetrySamples.values()].filter((sample) =>
        nodeIds.has(sample.nodeId) &&
        inWindow(sample.observedAt) &&
        isAnomalousTelemetry(sample),
      ),
    };
  }

  async linkReportToIncident(
    reportId: string,
    incidentId: string,
    correlationScore: number,
    _correlatedAt: string,
  ): Promise<CustomerReport> {
    const report = this.reports.get(reportId);
    if (!report) throw new Error("Report was not found for correlation.");
    const correlated = { ...report, state: "CORRELATED" as const, correlatedIncidentId: incidentId };
    this.reports.set(reportId, correlated);
    this.reportCorrelations.set(reportId, { incidentId, score: correlationScore });
    return correlated;
  }

  async listIncidents(filter: IncidentListFilter): Promise<readonly IncidentSummary[]> {
    let values = [...this.incidents.values()];
    if (filter.status) values = values.filter((item) => item.status === filter.status);
    if (filter.severity) values = values.filter((item) => item.severity === filter.severity);
    values.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return values.slice(0, filter.limit);
  }

  async findIncident(incidentId: string): Promise<IncidentSummary | null> {
    return this.incidents.get(incidentId) ?? null;
  }

  async findActiveIncidentByRootNode(nodeId: string): Promise<IncidentSummary | null> {
    return [...this.incidents.values()]
      .filter((incident) => incident.probableRootNodeId === nodeId)
      .filter((incident) => incident.status !== "RESOLVED" && incident.status !== "CLOSED")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
  }

  async createIncident(incident: IncidentSummary): Promise<void> {
    this.incidents.set(incident.id, incident);
  }

  async updateIncident(incident: IncidentSummary): Promise<void> {
    this.incidents.set(incident.id, incident);
  }

  async findIncidentGraph(incidentId: string): Promise<IncidentGraph | null> {
    const seeded = this.graphs.get(incidentId);
    if (seeded) return seeded;
    const incident = await this.findIncident(incidentId);
    if (!incident) return null;

    const nodes: IncidentGraph["nodes"] = [];
    const edges: IncidentGraph["edges"] = [];
    const addNode = (node: IncidentGraph["nodes"][number]) => {
      if (!nodes.some((item) => item.id === node.id)) nodes.push(node);
    };
    const linkedReports = [...this.reports.values()]
      .filter((report) => report.correlatedIncidentId === incidentId);
    for (const report of linkedReports) {
      addNode({ id: report.id, category: "REPORT", label: "Customer report", status: report.state, metadata: {} });
      if (report.serviceId) {
        addNode({ id: report.serviceId, category: "SERVICE", label: report.serviceId, status: null, metadata: {} });
        edges.push({ id: `report-service:${report.id}`, source: report.id, target: report.serviceId, type: "REPORT_AFFECTS_SERVICE" });
        for (const dependency of this.topologyDependencies.filter((item) => item.serviceId === report.serviceId)) {
          addNode({ id: dependency.nodeId, category: "INFRASTRUCTURE_NODE", label: dependency.nodeCode, status: dependency.nodeStatus, metadata: {} });
          edges.push({ id: `service-node:${report.serviceId}:${dependency.nodeId}`, source: report.serviceId, target: dependency.nodeId, type: "SERVICE_DEPENDS_ON_NODE" });
        }
      }
      if (report.areaCode) {
        const areaId = `area:${report.areaCode}`;
        addNode({ id: areaId, category: "AREA", label: report.areaCode, status: null, metadata: {} });
        edges.push({ id: `report-area:${report.id}`, source: report.id, target: areaId, type: "REPORT_LOCATED_IN_AREA" });
      }
    }
    for (const evidence of await this.listIncidentEvidence(incidentId)) {
      if (evidence.type !== "TELEMETRY_ANOMALY") continue;
      const sample = this.telemetrySamples.get(evidence.sourceId);
      if (!sample) continue;
      const telemetryId = `telemetry:${sample.id}`;
      addNode({ id: telemetryId, category: "TELEMETRY_ANOMALY", label: `${sample.metric} ${sample.value}`, status: "ANOMALOUS", metadata: { value: sample.value, unit: sample.unit } });
      const dependency = this.topologyDependencies.find((item) => item.nodeId === sample.nodeId);
      addNode({ id: sample.nodeId, category: "INFRASTRUCTURE_NODE", label: dependency?.nodeCode ?? sample.nodeId, status: dependency?.nodeStatus ?? "UNKNOWN", metadata: {} });
      edges.push({ id: `telemetry-node:${sample.id}`, source: telemetryId, target: sample.nodeId, type: "TELEMETRY_OBSERVED_ON_NODE" });
    }
    return { nodes, edges };
  }

  async listIncidentEvidence(incidentId: string): Promise<readonly IncidentEvidence[]> {
    return [...this.evidence.values()]
      .filter((item) => item.incidentId === incidentId)
      .sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  }

  async saveEvidence(evidence: IncidentEvidence): Promise<void> {
    this.evidence.set(evidence.id, evidence);
  }

  async appendAudit(event: AuditEventInput): Promise<void> {
    this.auditEvents.push(event);
  }

  async saveHypothesis(hypothesis: RootCauseHypothesis): Promise<void> {
    this.hypotheses.set(hypothesis.id, hypothesis);
  }

  async findLatestHypothesis(incidentId: string): Promise<RootCauseHypothesis | null> {
    return [...this.hypotheses.values()]
      .filter((item) => item.incidentId === incidentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  }

  async saveBlastRadius(snapshot: BlastRadiusSnapshot): Promise<void> {
    this.blastRadii.set(snapshot.id, snapshot);
  }

  async findLatestBlastRadius(incidentId: string): Promise<BlastRadiusSnapshot | null> {
    return [...this.blastRadii.values()]
      .filter((item) => item.incidentId === incidentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  }

  async saveProposal(proposal: RemediationProposal): Promise<void> {
    this.proposals.set(proposal.id, proposal);
  }

  async findProposal(proposalId: string): Promise<RemediationProposal | null> {
    return this.proposals.get(proposalId) ?? null;
  }

  async findLatestProposalForIncident(incidentId: string): Promise<RemediationProposal | null> {
    return [...this.proposals.values()]
      .filter((item) => item.incidentId === incidentId)
      .sort((a, b) => b.version - a.version)[0] ?? null;
  }

  async updateProposal(proposal: RemediationProposal): Promise<void> {
    this.proposals.set(proposal.id, proposal);
  }

  async saveDecision(decision: ApprovalDecision): Promise<void> {
    this.decisions.set(decision.id, decision);
  }

  async findExecutionByProposal(proposalId: string): Promise<RemediationExecution | null> {
    return [...this.executions.values()].find(
      (execution) => execution.proposalId === proposalId,
    ) ?? null;
  }

  async saveExecution(execution: RemediationExecution): Promise<void> {
    this.executions.set(execution.id, execution);
  }

  async saveVerification(snapshot: VerificationSnapshot): Promise<void> {
    this.verifications.set(snapshot.id, snapshot);
  }

  async saveCommunication(communication: CustomerCommunication): Promise<void> {
    this.communications.set(communication.id, communication);
  }

  async listIntegrationHealth(): Promise<readonly IntegrationHealthRecord[]> {
    return [...this.integrationHealth.values()];
  }

  async saveTelemetrySamples(samples: readonly TelemetrySample[]): Promise<void> {
    for (const sample of samples) this.telemetrySamples.set(sample.id, sample);
  }
}

function isAnomalousTelemetry(sample: TelemetrySample): boolean {
  return (sample.metric === "LATENCY_MS" && sample.value >= 100) ||
    (sample.metric === "PACKET_LOSS_PCT" && sample.value >= 5);
}
