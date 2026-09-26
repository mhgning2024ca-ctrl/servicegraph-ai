/**
 * The backend depends on these generic boundaries while concrete contracts and
 * adapters remain owned by their assigned packages. Generic parameters prevent
 * this package from defining competing domain payloads.
 */
export interface TransactionRunner {
  run<T>(operation: () => Promise<T>): Promise<T>;
}

export interface IdempotencyPort<TResult> {
  find(key: string): Promise<TResult | null>;
  store(key: string, result: TResult): Promise<void>;
}

export interface ReportRepository<TReport, TCreateInput> {
  create(input: TCreateInput): Promise<TReport>;
  findById(id: string): Promise<TReport | null>;
}

export interface IncidentRepository<TIncident, TListQuery, TDetail> {
  list(query: TListQuery): Promise<readonly TIncident[]>;
  findDetail(id: string): Promise<TDetail | null>;
}

export interface RemediationRepository<TProposal, TDecision, TExecution> {
  findProposal(id: string): Promise<TProposal | null>;
  recordDecision(decision: TDecision): Promise<void>;
  recordExecution(execution: TExecution): Promise<void>;
}

export interface AuthorizationPort<TActor> {
  authenticate(authorizationHeader: string | undefined): Promise<TActor>;
  assertPermission(actor: TActor, permission: string): Promise<void>;
}

export interface AuditPort<TAuditEvent> {
  append(event: TAuditEvent): Promise<void>;
}

export interface AnalysisPort<TEvidencePacket, THypothesis> {
  analyze(packet: TEvidencePacket, correlationId: string): Promise<THypothesis>;
}

export interface SimulatorPort<TAction, TResult> {
  execute(action: TAction, idempotencyKey: string, correlationId: string): Promise<TResult>;
}

export interface VerificationPort<TRequest, TSnapshot> {
  verify(request: TRequest, correlationId: string): Promise<TSnapshot>;
}
