import Fastify, { type FastifyInstance } from "fastify";

import {
  DenyAllAuthorizationAdapter,
  type AuthorizationAdapter,
} from "../auth/authorization.js";
import { InMemoryBackendRepository } from "../mocks/in-memory-backend.js";
import { AuditService } from "../modules/audit/audit-service.js";
import { registerHealthRoutes } from "../modules/health/routes.js";
import { registerIncidentGraphRoute } from "../modules/incidents/routes.js";
import {
  ReportService,
  type ReportPostProcessor,
} from "../modules/reports/report-service.js";
import { registerReportRoutes } from "../modules/reports/routes.js";
import type { BackendRepository } from "../ports/backend-ports.js";
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
  const audit = new AuditService(repository);
  const reportService = new ReportService(
    repository,
    idempotency,
    events,
    audit,
    options.dependencies?.reportPostProcessor,
  );

  registerHealthRoutes(app, repository);
  registerReportRoutes(app, reportService);
  registerIncidentGraphRoute(app, repository, authorization);
  registerSseRoute(app, events, authorization);
  return app;
}
