import type { FastifyInstance } from "fastify";

import { requirePermission, type AuthorizationAdapter } from "../../auth/authorization.js";
import type { BackendRepository } from "../../ports/backend-ports.js";
import { ApiError } from "../../shared/api-error.js";

export function registerHealthRoutes(
  app: FastifyInstance,
  repository: BackendRepository,
  authorization: AuthorizationAdapter,
): void {
  app.get("/v1/health/live", async (_request, reply) => reply.status(204).send());
  app.get("/v1/health/ready", async (_request, reply) => {
    if (!(await repository.isReady())) {
      throw new ApiError({
        code: "SERVICE_UNAVAILABLE",
        statusCode: 503,
        message: "Required persistence is unavailable.",
      });
    }
    return reply.status(204).send();
  });

  app.get("/v1/health/integrations", async (request) => {
    await requirePermission(request, authorization, "incidents:read");
    return { integrations: await repository.listIntegrationHealth() };
  });
}
