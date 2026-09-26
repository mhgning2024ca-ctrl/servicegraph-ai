import type {
  ApprovalDecision,
  BlastRadiusSnapshot,
  CustomerReport,
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
} from "../ports/backend-ports.js";

export class InMemoryBackendRepository implements BackendRepository {
  readonly reports = new Map<string, CustomerReport>();
  readonly graphs = new Map<string, IncidentGraph>();
  readonly incidents = new Map<string, IncidentSummary>();
  readonly hypotheses = new Map<string, RootCauseHypothesis>();
  readonly blastRadii = new Map<string, BlastRadiusSnapshot>();
  readonly proposals = new Map<string, RemediationProposal>();
  readonly decisions = new Map<string, ApprovalDecision>();
  readonly executions = new Map<string, RemediationExecution>();
  readonly verifications = new Map<string, VerificationSnapshot>();
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

  async findIncidentGraph(incidentId: string): Promise<IncidentGraph | null> {
    return this.graphs.get(incidentId) ?? null;
  }

  async appendAudit(event: AuditEventInput): Promise<void> {
    this.auditEvents.push(event);
  }

  async findIncident(incidentId: string): Promise<IncidentSummary | null> {
    return this.incidents.get(incidentId) ?? null;
  }

  async updateIncident(incident: IncidentSummary): Promise<void> {
    this.incidents.set(incident.id, incident);
  }

  async saveHypothesis(hypothesis: RootCauseHypothesis): Promise<void> {
    this.hypotheses.set(hypothesis.id, hypothesis);
  }

  async saveBlastRadius(snapshot: BlastRadiusSnapshot): Promise<void> {
    this.blastRadii.set(snapshot.id, snapshot);
  }

  async findProposal(proposalId: string): Promise<RemediationProposal | null> {
    return this.proposals.get(proposalId) ?? null;
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
}
