import type { FastifyInstance } from "fastify";

import { registerCorrelationIds } from "../shared/correlation-id.js";
import { registerErrorHandler } from "../shared/error-handler.js";

export interface ApiInfrastructureOptions {
  generateCorrelationId?: () => string;
}

export async function registerApiInfrastructure(
  app: FastifyInstance,
  options: ApiInfrastructureOptions = {},
): Promise<void> {
  const correlationOptions = options.generateCorrelationId
    ? { generateCorrelationId: options.generateCorrelationId }
    : {};
  await registerCorrelationIds(app, correlationOptions);
  registerErrorHandler(app);
}
