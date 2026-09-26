import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";

import {
  AnalyzeIncidentResponseSchema,
  IncidentDetailResponseSchema,
  IncidentEvidenceResponseSchema,
  IncidentGraphResponseSchema,
  IncidentIdParamsSchema,
  ListIncidentsQuerySchema,
  ListIncidentsResponseSchema,
} from "@servicegraph/contracts";

import { requirePermission, type AuthorizationAdapter } from "../../auth/authorization.js";
import type { BackendRepository } from "../../ports/backend-ports.js";
import { ApiError } from "../../shared/api-error.js";
import { parseSchema } from "../../shared/parse-schema.js";
import type { IncidentAnalysisOrchestrator } from "./analysis-orchestrator.js";

export function registerIncidentRoutes(
  app: FastifyInstance,
  repository: BackendRepository,
  authorization: AuthorizationAdapter,
  analysis: IncidentAnalysisOrchestrator,
): void {
  app.get("/v1/incidents", async (request) => {
    await requirePermission(request, authorization, "incidents:read");
    const query = parseSchema(ListIncidentsQuerySchema, request.query);
    const items = await repository.listIncidents(query);
    return ListIncidentsResponseSchema.parse({ items, nextCursor: null });
  });

  app.get("/v1/incidents/:id", async (request) => {
    await requirePermission(request, authorization, "incidents:read");
    const { id } = parseSchema(IncidentIdParamsSchema, request.params);
    const incident = await repository.findIncident(id);
    if (!incident) throw notFound("Incident was not found.");

    return IncidentDetailResponseSchema.parse({
      incident,
      rootCauseHypothesis: await repository.findLatestHypothesis(id),
      blastRadius: await repository.findLatestBlastRadius(id),
      remediationProposal: await repository.findLatestProposalForIncident(id),
      integrationStates: await repository.listIntegrationHealth(),
    });
  });

  app.get("/v1/incidents/:id/evidence", async (request) => {
    await requirePermission(request, authorization, "incidents:read");
    const { id } = parseSchema(IncidentIdParamsSchema, request.params);
    if (!(await repository.findIncident(id))) throw notFound("Incident was not found.");
    return IncidentEvidenceResponseSchema.parse({
      evidence: await repository.listIncidentEvidence(id),
    });
  });

  app.get("/v1/incidents/:id/graph", async (request) => {
    await requirePermission(request, authorization, "incidents:read");
    const { id } = parseSchema(IncidentIdParamsSchema, request.params);
    const graph = await repository.findIncidentGraph(id);
    if (!graph) throw notFound("Incident graph was not found.");
    return IncidentGraphResponseSchema.parse(graph);
  });

  app.post("/v1/incidents/:id/analyze", async (request, reply) => {
    const actor = await requirePermission(request, authorization, "incidents:analyze");
    const { id } = parseSchema(IncidentIdParamsSchema, request.params);
    const incident = await repository.findIncident(id);
    if (!incident) throw notFound("Incident was not found.");

    const result = await analysis.analyze(incident, request.correlationId, actor.subject);
    await repository.updateIncident({
      ...incident,
      probableRootNodeId: result.hypothesis.targetNodeId,
      rootCauseConfidence: result.hypothesis.confidence,
      updatedAt: result.hypothesis.createdAt,
    });

    return reply.status(202).send(AnalyzeIncidentResponseSchema.parse({
      operationId: randomUUID(),
      status: "ACCEPTED",
    }));
  });
}

function notFound(message: string): ApiError {
  return new ApiError({ code: "NOT_FOUND", statusCode: 404, message });
}
