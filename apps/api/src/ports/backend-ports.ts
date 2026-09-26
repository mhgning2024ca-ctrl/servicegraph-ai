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

export interface AuditEventInput {
  id: string;
  createdAt: string;
  correlationId: string;
  actorSubject: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown>;
}

export interface IntegrationHealthRecord {
  provider: string;
  state: "AVAILABLE" | "DEGRADED" | "UNAVAILABLE";
  checkedAt: string;
  reasonCode: string | null;
}

export interface IncidentListFilter {
  status?: IncidentSummary["status"] | undefined;
  severity?: IncidentSummary["severity"] | undefined;
  limit: number;
  cursor?: string | undefined;
}

export interface BackendRepository {
  isReady(): Promise<boolean>;

  createReport(report: CustomerReport): Promise<CustomerReport>;
  findReport(reportId: string): Promise<CustomerReport | null>;

  listIncidents(filter: IncidentListFilter): Promise<readonly IncidentSummary[]>;
  findIncident(incidentId: string): Promise<IncidentSummary | null>;
  updateIncident(incident: IncidentSummary): Promise<void>;

  findIncidentGraph(incidentId: string): Promise<IncidentGraph | null>;
  listIncidentEvidence(incidentId: string): Promise<readonly IncidentEvidence[]>;
  saveEvidence(evidence: IncidentEvidence): Promise<void>;

  saveHypothesis(hypothesis: RootCauseHypothesis): Promise<void>;
  findLatestHypothesis(incidentId: string): Promise<RootCauseHypothesis | null>;

  saveBlastRadius(snapshot: BlastRadiusSnapshot): Promise<void>;
  findLatestBlastRadius(incidentId: string): Promise<BlastRadiusSnapshot | null>;

  saveProposal(proposal: RemediationProposal): Promise<void>;
  findProposal(proposalId: string): Promise<RemediationProposal | null>;
  findLatestProposalForIncident(incidentId: string): Promise<RemediationProposal | null>;
  updateProposal(proposal: RemediationProposal): Promise<void>;

  saveDecision(decision: ApprovalDecision): Promise<void>;
  findExecutionByProposal(proposalId: string): Promise<RemediationExecution | null>;
  saveExecution(execution: RemediationExecution): Promise<void>;
  saveVerification(snapshot: VerificationSnapshot): Promise<void>;

  saveCommunication(communication: CustomerCommunication): Promise<void>;
  listIntegrationHealth(): Promise<readonly IntegrationHealthRecord[]>;

  appendAudit(event: AuditEventInput): Promise<void>;
}

export type IntegrationResult<T> =
  | { ok: true; data: T; provider: string; durationMs: number }
  | {
      ok: false;
      errorCode: string;
      retryable: boolean;
      provider: string;
      durationMs: number;
    };

export interface IncidentAnalysisResult {
  hypothesis: RootCauseHypothesis;
  blastRadius: BlastRadiusSnapshot;
}

export interface IncidentAnalysisAdapter {
  analyze(incidentId: string, correlationId: string): Promise<IntegrationResult<IncidentAnalysisResult>>;
}

export interface SimulatorExecutionAdapter {
  execute(
    proposal: RemediationProposal,
    idempotencyKey: string,
    correlationId: string,
  ): Promise<IntegrationResult<RemediationExecution>>;
}

export interface VerificationAdapter {
  verify(
    incident: IncidentSummary,
    execution: RemediationExecution,
    correlationId: string,
  ): Promise<VerificationSnapshot>;
}

export interface ScenarioRuntime {
  start(speed: number, correlationId: string): Promise<{
    scenarioId: string;
    scenarioKey: "node17-degradation";
    state: "RUNNING" | "DEGRADED" | "RECOVERING" | "RECOVERED" | "RESET";
    startedAt: string;
    speed: number;
    targetNodeId: string;
  }>;
  status(scenarioId: string): Promise<{
    scenarioId: string;
    scenarioKey: "node17-degradation";
    state: "RUNNING" | "DEGRADED" | "RECOVERING" | "RECOVERED" | "RESET";
    startedAt: string;
    speed: number;
    targetNodeId: string;
  } | null>;
  reset(correlationId: string): Promise<void>;
}
