import Fastify, { type FastifyInstance } from "fastify";

import {
  DenyAllAuthorizationAdapter,
  type AuthorizationAdapter,
} from "../auth/authorization.js";
import {
  DeterministicIncidentAnalysisAdapter,
  DeterministicScenarioRuntime,
  DeterministicSimulatorAdapter,
  DeterministicVerificationAdapter,
} from "../mocks/demo-runtime.js";
import { InMemoryBackendRepository } from "../mocks/in-memory-backend.js";
import { AuditService } from "../modules/audit/audit-service.js";
import { registerCommunicationRoutes } from "../modules/communications/routes.js";
import { registerHealthRoutes } from "../modules/health/routes.js";
import { IncidentAnalysisOrchestrator } from "../modules/incidents/analysis-orchestrator.js";
import { registerIncidentRoutes } from "../modules/incidents/full-routes.js";
import { RemediationOrchestrator } from "../modules/remediation/remediation-orchestrator.js";
import { registerRemediationRoutes } from "../modules/remediation/routes.js";
import {
  ReportService,
  type ReportPostProcessor,
} from "../modules/reports/report-service.js";
import { registerReportRoutes } from "../modules/reports/routes.js";
import { registerSimulatorRoutes } from "../modules/simulator/routes.js";
import type {
  BackendRepository,
  IncidentAnalysisAdapter,
  ScenarioRuntime,
  SimulatorExecutionAdapter,
  VerificationAdapter,
} from "../ports/backend-ports.js";
import {
  InMemoryOperationalEventBus,
  type OperationalEventBus,
} from "../realtime/operational-event-bus.js";
import { registerSseRoute } from "../realtime/sse-route.js";
import { InMemoryIdempotencyStore, type IdempotencyStore } from "../shared/idempotency.js";
import {
  registerApiInfrastructure,
  type ApiInfrastructureOptions,
} from "./register-api-infrastructure.js";

export interface ApiDependencies {
  repository: BackendRepository;
  authorization: AuthorizationAdapter;
  events: OperationalEventBus;
  idempotency: IdempotencyStore;
  reportPostProcessor?: ReportPostProcessor;
  incidentAnalysis: IncidentAnalysisAdapter;
  simulator: SimulatorExecutionAdapter;
  verifier: VerificationAdapter;
  scenarioRuntime: ScenarioRuntime;
}

export interface CreateApiAppOptions extends ApiInfrastructureOptions {
  logger?: boolean;
  dependencies?: Partial<ApiDependencies>;
}

export async function createApiApp(
  options: CreateApiAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: 1_048_576,
  });
  await registerApiInfrastructure(app, options);

  const repository = options.dependencies?.repository ?? new InMemoryBackendRepository();
  const authorization =
    options.dependencies?.authorization ?? new DenyAllAuthorizationAdapter();
  const events = options.dependencies?.events ?? new InMemoryOperationalEventBus();
  const idempotency =
    options.dependencies?.idempotency ?? new InMemoryIdempotencyStore();
  const incidentAnalysis =
    options.dependencies?.incidentAnalysis ?? new DeterministicIncidentAnalysisAdapter();
  const simulator =
    options.dependencies?.simulator ?? new DeterministicSimulatorAdapter();
  const verifier =
    options.dependencies?.verifier ?? new DeterministicVerificationAdapter();
  const scenarioRuntime =
    options.dependencies?.scenarioRuntime ?? new DeterministicScenarioRuntime();

  const audit = new AuditService(repository);
  const reportService = new ReportService(
    repository,
    idempotency,
    events,
    audit,
    options.dependencies?.reportPostProcessor,
  );
  const analysis = new IncidentAnalysisOrchestrator(repository, incidentAnalysis, events, audit);
  const remediation = new RemediationOrchestrator(
    repository,
    simulator,
    verifier,
    idempotency,
    events,
    audit,
  );

  registerHealthRoutes(app, repository);
  registerReportRoutes(app, reportService);
  registerIncidentRoutes(app, repository, authorization, analysis);
  registerRemediationRoutes(app, repository, authorization, remediation, events);
  registerCommunicationRoutes(app, repository, authorization, events, audit);
  registerSimulatorRoutes(app, scenarioRuntime, authorization);
  registerSseRoute(app, events, authorization);
  return app;
}
