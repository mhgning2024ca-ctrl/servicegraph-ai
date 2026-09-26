export {
  createApiApp,
  type ApiDependencies,
  type CreateApiAppOptions,
} from "./app/create-api-app.js";
export { registerApiInfrastructure } from "./app/register-api-infrastructure.js";
export { A5RequestContextAuthorizationAdapter } from "./auth/a5-bridge.js";
export {
  assertApprovalRole,
  CANONICAL_PERMISSIONS,
  DenyAllAuthorizationAdapter,
  requirePermission,
  type AuthenticatedActor,
  type AuthorizationAdapter,
  type CanonicalPermission,
  type CanonicalRole,
} from "./auth/authorization.js";
export { InMemoryBackendRepository } from "./mocks/in-memory-backend.js";
export { IncidentAnalysisOrchestrator } from "./modules/incidents/analysis-orchestrator.js";
export { RemediationOrchestrator } from "./modules/remediation/remediation-orchestrator.js";
export { ReportService, type ReportPostProcessor } from "./modules/reports/report-service.js";
export type {
  AuditEventInput,
  BackendRepository,
  IncidentAnalysisAdapter,
  IncidentAnalysisResult,
  IntegrationResult,
  SimulatorExecutionAdapter,
  VerificationAdapter,
} from "./ports/backend-ports.js";
export {
  InMemoryOperationalEventBus,
  type OperationalEventBus,
  type OperationalEventSubscription,
} from "./realtime/operational-event-bus.js";
export { serializeSseEvent } from "./realtime/sse-route.js";
export { ApiError, type ApiErrorOptions } from "./shared/api-error.js";
export { InMemoryIdempotencyStore, type IdempotencyStore } from "./shared/idempotency.js";
export { assertIncidentTransition } from "./shared/state-machine.js";
