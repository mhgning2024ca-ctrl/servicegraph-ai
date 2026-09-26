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

import type {
  AuditEventInput,
  BackendRepository,
  IncidentListFilter,
  IntegrationHealthRecord,
} from "../ports/backend-ports.js";

export class InMemoryBackendRepository implements BackendRepository {
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

  async updateIncident(incident: IncidentSummary): Promise<void> {
    this.incidents.set(incident.id, incident);
  }

  async findIncidentGraph(incidentId: string): Promise<IncidentGraph | null> {
    return this.graphs.get(incidentId) ?? null;
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
}
