import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";

import {
  CreateCommunicationRequestSchema,
  CreateCommunicationResponseSchema,
  IncidentIdParamsSchema,
} from "@servicegraph/contracts";

import { requirePermission, type AuthorizationAdapter } from "../../auth/authorization.js";
import type { BackendRepository } from "../../ports/backend-ports.js";
import { ApiError } from "../../shared/api-error.js";
import { parseSchema } from "../../shared/parse-schema.js";
import type { OperationalEventBus } from "../../realtime/operational-event-bus.js";
import { AuditService } from "../audit/audit-service.js";

export function registerCommunicationRoutes(
  app: FastifyInstance,
  repository: BackendRepository,
  authorization: AuthorizationAdapter,
  events: OperationalEventBus,
  audit: AuditService,
): void {
  app.post("/v1/incidents/:id/communications", async (request, reply) => {
    const actor = await requirePermission(request, authorization, "communications:create");
    const { id } = parseSchema(IncidentIdParamsSchema, request.params);
    const input = parseSchema(CreateCommunicationRequestSchema, request.body);
    const incident = await repository.findIncident(id);
    if (!incident) throw new ApiError({ code: "NOT_FOUND", statusCode: 404, message: "Incident was not found." });

    const communication = {
      id: randomUUID(),
      incidentId: id,
      createdAt: new Date().toISOString(),
      audience: input.audience,
      language: input.language,
      text: input.text,
      voiceAssetId: null,
      state: "READY" as const,
    };
    await repository.saveCommunication(communication);
    await audit.record({
      correlationId: request.correlationId,
      actorSubject: actor.subject,
      action: "communication.created",
      entityType: "INCIDENT",
      entityId: id,
      payload: { audience: input.audience, language: input.language },
    });
    events.publish({
      id: randomUUID(),
      type: "communication.created",
      occurredAt: communication.createdAt,
      correlationId: request.correlationId,
      entityId: communication.id,
      payload: { incidentId: id, audience: input.audience, language: input.language },
    });
    return reply.status(201).send(CreateCommunicationResponseSchema.parse({ communication }));
  });
}
