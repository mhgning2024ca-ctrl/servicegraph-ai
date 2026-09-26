import type { FastifyInstance } from "fastify";

import {
  ScenarioIdParamsSchema,
  ScenarioKeyParamsSchema,
  ScenarioResponseSchema,
  StartScenarioRequestSchema,
} from "@servicegraph/contracts";

import { requirePermission, type AuthorizationAdapter } from "../../auth/authorization.js";
import type { ScenarioRuntime } from "../../ports/backend-ports.js";
import { ApiError } from "../../shared/api-error.js";
import { parseSchema } from "../../shared/parse-schema.js";

export function registerSimulatorRoutes(
  app: FastifyInstance,
  runtime: ScenarioRuntime,
  authorization: AuthorizationAdapter,
): void {
  app.post("/v1/simulator/scenarios/:scenarioKey/start", async (request, reply) => {
    await requirePermission(request, authorization, "simulator:control");
    parseSchema(ScenarioKeyParamsSchema, request.params);
    const input = parseSchema(StartScenarioRequestSchema, request.body);
    const scenario = await runtime.start(input.speed, request.correlationId);
    return reply.status(201).send(ScenarioResponseSchema.parse(scenario));
  });

  app.get("/v1/simulator/scenarios/:scenarioId", async (request) => {
    await requirePermission(request, authorization, "incidents:read");
    const { scenarioId } = parseSchema(ScenarioIdParamsSchema, request.params);
    const scenario = await runtime.status(scenarioId);
    if (!scenario) throw new ApiError({ code: "NOT_FOUND", statusCode: 404, message: "Simulator scenario was not found." });
    return ScenarioResponseSchema.parse(scenario);
  });

  app.post("/v1/simulator/reset", async (request, reply) => {
    await requirePermission(request, authorization, "simulator:control");
    await runtime.reset(request.correlationId);
    return reply.status(204).send();
  });
}
