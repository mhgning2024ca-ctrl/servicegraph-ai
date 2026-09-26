import Fastify, { type FastifyInstance } from "fastify";

import {
  registerApiInfrastructure,
  type ApiInfrastructureOptions,
} from "./register-api-infrastructure.js";

export interface CreateApiAppOptions extends ApiInfrastructureOptions {
  logger?: boolean;
}

/**
 * Creates the API process shell. Public routes are deliberately registered by
 * their modules only after their shared schemas exist in packages/contracts.
 */
export async function createApiApp(
  options: CreateApiAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });

  await registerApiInfrastructure(app, options);

  return app;
}
