import type { FastifyInstance } from "fastify";

import {
  IncidentGraphResponseSchema,
  IncidentIdParamsSchema,
} from "@servicegraph/contracts";

import {
  requirePermission,
  type AuthorizationAdapter,
} from "../../auth/authorization.js";
import type { BackendRepository } from "../../ports/backend-ports.js";
import { ApiError } from "../../shared/api-error.js";
import { parseSchema } from "../../shared/parse-schema.js";

export function registerIncidentGraphRoute(
  app: FastifyInstance,
  repository: BackendRepository,
  authorization: AuthorizationAdapter,
): void {
  app.get("/v1/incidents/:id/graph", async (request) => {
    await requirePermission(request, authorization, "incidents:read");
    const { id } = parseSchema(IncidentIdParamsSchema, request.params);
    const graph = await repository.findIncidentGraph(id);
    if (!graph) {
      throw new ApiError({
        code: "NOT_FOUND",
        statusCode: 404,
        message: "Incident graph was not found.",
      });
    }
    return IncidentGraphResponseSchema.parse(graph);
  });
}
