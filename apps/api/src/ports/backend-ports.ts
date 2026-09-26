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

export interface BackendRepository {
  isReady(): Promise<boolean>;
  createReport(report: CustomerReport): Promise<CustomerReport>;
  findIncidentGraph(incidentId: string): Promise<IncidentGraph | null>;
  appendAudit(event: AuditEventInput): Promise<void>;
  findIncident(incidentId: string): Promise<IncidentSummary | null>;
  updateIncident(incident: IncidentSummary): Promise<void>;
  saveHypothesis(hypothesis: RootCauseHypothesis): Promise<void>;
  saveBlastRadius(snapshot: BlastRadiusSnapshot): Promise<void>;
  findProposal(proposalId: string): Promise<RemediationProposal | null>;
  updateProposal(proposal: RemediationProposal): Promise<void>;
  saveDecision(decision: ApprovalDecision): Promise<void>;
  findExecutionByProposal(proposalId: string): Promise<RemediationExecution | null>;
  saveExecution(execution: RemediationExecution): Promise<void>;
  saveVerification(snapshot: VerificationSnapshot): Promise<void>;
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
