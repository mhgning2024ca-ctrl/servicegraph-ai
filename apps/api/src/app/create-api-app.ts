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
import { createRuntimeAiIncidentAnalysisAdapter } from "../modules/incidents/runtime-ai-adapter.js";
import { RemediationOrchestrator } from "../modules/remediation/remediation-orchestrator.js";
import { registerRemediationRoutes } from "../modules/remediation/routes.js";
import {
  ReportService,
  type ReportPostProcessor,
} from "../modules/reports/report-service.js";
import { DeterministicReportCorrelationProcessor } from "../modules/reports/report-correlation-processor.js";
import { registerReportRoutes } from "../modules/reports/routes.js";
import { registerSimulatorRoutes } from "../modules/simulator/routes.js";
import { registerTelemetryRoutes } from "../modules/telemetry/routes.js";
import { registerPublicRoutes } from "../modules/public/routes.js";
import { registerVoiceRoutes } from "../modules/voice/routes.js";
import type {
  BackendRepository,
  IncidentAnalysisAdapter,
  ScenarioRuntime,
  SimulatorExecutionAdapter,
  TelemetryStore,
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
  telemetry: TelemetryStore;
}

export interface CreateApiAppOptions extends ApiInfrastructureOptions {
  logger?: boolean;
  allowedOrigins?: readonly string[];
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
  const allowedOrigins = new Set(options.allowedOrigins ?? ["http://localhost:3000"]);
  app.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && !allowedOrigins.has(origin)) {
      return reply.status(403).send({
        error: {
          code: "CORS_FORBIDDEN",
          message: "Origin is not allowed.",
          details: [],
          correlationId: request.correlationId,
        },
      });
    }
    if (origin) {
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Vary", "Origin");
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key, X-Correlation-Id");
      reply.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }
    if (request.method === "OPTIONS") return reply.status(204).send();
  });

  const repository = options.dependencies?.repository ?? new InMemoryBackendRepository();
  const authorization =
    options.dependencies?.authorization ?? new DenyAllAuthorizationAdapter();
  const events = options.dependencies?.events ?? new InMemoryOperationalEventBus();
  const idempotency =
    options.dependencies?.idempotency ?? new InMemoryIdempotencyStore();
  // A deterministic analyzer is only used when explicitly injected (tests or
  // a dedicated mock composition). The default server path reports Gemini
  // unavailability/degradation rather than fabricating a hypothesis.
  const incidentAnalysis =
    options.dependencies?.incidentAnalysis ?? createRuntimeAiIncidentAnalysisAdapter(repository);
  const simulator =
    options.dependencies?.simulator ?? new DeterministicSimulatorAdapter();
  const verifier =
    options.dependencies?.verifier ?? new DeterministicVerificationAdapter();
  const scenarioRuntime =
    options.dependencies?.scenarioRuntime ?? new DeterministicScenarioRuntime();
  const telemetry = options.dependencies?.telemetry ?? repository as unknown as TelemetryStore;

  const audit = new AuditService(repository);
  // The server composition always enables deterministic post-persistence
  // correlation. Tests may still inject a narrower processor where needed.
  const reportPostProcessor = options.dependencies?.reportPostProcessor ??
    new DeterministicReportCorrelationProcessor(repository, events, audit);
  const reportService = new ReportService(
    repository,
    idempotency,
    events,
    audit,
    reportPostProcessor,
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

  registerHealthRoutes(app, repository, authorization);
  registerReportRoutes(app, reportService, repository, authorization);
  registerIncidentRoutes(app, repository, authorization, analysis);
  registerRemediationRoutes(app, repository, authorization, remediation, events);
  registerCommunicationRoutes(app, repository, authorization, events, audit);
  registerSimulatorRoutes(app, scenarioRuntime, authorization);
  registerTelemetryRoutes(app, telemetry, authorization, events);
  registerPublicRoutes(app, repository, events);
  registerVoiceRoutes(app);
  registerSseRoute(app, events, authorization);
  return app;
}
