import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";

import {
  CreateRemediationProposalRequestSchema,
  CreateRemediationProposalResponseSchema,
  IncidentIdParamsSchema,
  ProposalIdParamsSchema,
  RemediationDecisionRequestSchema,
  RemediationDecisionResponseSchema,
  RemediationExecutionResponseSchema,
  VerificationResponseSchema,
} from "@servicegraph/contracts";

import { requirePermission, type AuthorizationAdapter } from "../../auth/authorization.js";
import type { BackendRepository } from "../../ports/backend-ports.js";
import { ApiError } from "../../shared/api-error.js";
import { parseSchema } from "../../shared/parse-schema.js";
import { assertIncidentTransition } from "../../shared/state-machine.js";
import type { OperationalEventBus } from "../../realtime/operational-event-bus.js";
import type { RemediationOrchestrator } from "./remediation-orchestrator.js";

export function registerRemediationRoutes(
  app: FastifyInstance,
  repository: BackendRepository,
  authorization: AuthorizationAdapter,
  orchestrator: RemediationOrchestrator,
  events: OperationalEventBus,
): void {
  app.post("/v1/incidents/:id/remediation-proposals", async (request, reply) => {
    const actor = await requirePermission(request, authorization, "remediation:propose");
    const { id } = parseSchema(IncidentIdParamsSchema, request.params);
    const input = parseSchema(CreateRemediationProposalRequestSchema, request.body);
    const incident = await repository.findIncident(id);
    if (!incident) throw notFound("Incident was not found.");

    if (!["CONFIRMED", "REMEDIATION_PROPOSED", "AWAITING_APPROVAL"].includes(incident.status)) {
      throw new ApiError({ code: "INVALID_STATE_TRANSITION", statusCode: 409, message: "Incident is not ready for a remediation proposal." });
    }

    const createdAt = new Date().toISOString();
    const proposal = {
      id: randomUUID(),
      incidentId: id,
      version: input.version,
      createdAt,
      createdBy: input.createdBy,
      actionType: input.actionType,
      targetNodeId: input.targetNodeId,
      parameters: input.parameters,
      rationale: input.rationale,
      expectedEffect: input.expectedEffect,
      risk: input.risk,
      evidenceIds: input.evidenceIds,
      state: "PENDING_APPROVAL" as const,
    };
    await repository.saveProposal(proposal);

    let updated = incident;
    if (updated.status === "CONFIRMED") {
      assertIncidentTransition(updated.status, "REMEDIATION_PROPOSED");
      updated = { ...updated, status: "REMEDIATION_PROPOSED", updatedAt: createdAt };
      await repository.updateIncident(updated);
    }
    if (updated.status === "REMEDIATION_PROPOSED") {
      assertIncidentTransition(updated.status, "AWAITING_APPROVAL");
      updated = { ...updated, status: "AWAITING_APPROVAL", updatedAt: createdAt };
      await repository.updateIncident(updated);
    }

    events.publish({
      id: randomUUID(),
      type: "remediation.proposed",
      occurredAt: createdAt,
      correlationId: request.correlationId,
      entityId: proposal.id,
      payload: { incidentId: id, actorSubject: actor.subject, proposalVersion: proposal.version },
    });

    return reply.status(201).send(CreateRemediationProposalResponseSchema.parse({ proposal }));
  });

  app.post("/v1/remediation-proposals/:proposalId/decision", async (request) => {
    const actor = await requirePermission(request, authorization, "remediation:approve");
    const { proposalId } = parseSchema(ProposalIdParamsSchema, request.params);
    const input = parseSchema(RemediationDecisionRequestSchema, request.body);
    const decision = await orchestrator.decide({
      proposalId,
      proposalVersion: input.proposalVersion,
      decision: input.decision,
      comment: input.comment,
      actor,
      correlationId: request.correlationId,
    });
    return RemediationDecisionResponseSchema.parse({ decision });
  });

  app.post("/v1/remediation-proposals/:proposalId/execute", async (request) => {
    const actor = await requirePermission(request, authorization, "remediation:execute");
    const { proposalId } = parseSchema(ProposalIdParamsSchema, request.params);
    const idempotencyKey = request.headers["idempotency-key"];
    if (typeof idempotencyKey !== "string" || idempotencyKey.trim() === "") {
      throw new ApiError({ code: "VALIDATION_ERROR", statusCode: 400, message: "Idempotency-Key header is required." });
    }
    const execution = await orchestrator.execute(proposalId, idempotencyKey, actor, request.correlationId);
    return RemediationExecutionResponseSchema.parse({ execution });
  });

  app.post("/v1/incidents/:id/verify", async (request) => {
    const actor = await requirePermission(request, authorization, "incidents:verify");
    const { id } = parseSchema(IncidentIdParamsSchema, request.params);
    const proposal = await repository.findLatestProposalForIncident(id);
    if (!proposal) throw notFound("Remediation proposal was not found.");
    const execution = await repository.findExecutionByProposal(proposal.id);
    if (!execution) throw notFound("Remediation execution was not found.");
    const verification = await orchestrator.verify(id, execution, actor, request.correlationId);
    return VerificationResponseSchema.parse({ verification });
  });
}

function notFound(message: string): ApiError {
  return new ApiError({ code: "NOT_FOUND", statusCode: 404, message });
}
