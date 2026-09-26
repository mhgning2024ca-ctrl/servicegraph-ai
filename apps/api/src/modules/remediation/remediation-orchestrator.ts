import { createHash, randomUUID } from "node:crypto";

import type {
  ApprovalDecision,
  ApprovalDecisionType,
  RemediationExecution,
  VerificationSnapshot,
} from "@servicegraph/contracts";

import {
  assertApprovalRole,
  type AuthenticatedActor,
} from "../../auth/authorization.js";
import type {
  BackendRepository,
  SimulatorExecutionAdapter,
  VerificationAdapter,
} from "../../ports/backend-ports.js";
import type { OperationalEventBus } from "../../realtime/operational-event-bus.js";
import { ApiError } from "../../shared/api-error.js";
import type { IdempotencyStore } from "../../shared/idempotency.js";
import { assertIncidentTransition } from "../../shared/state-machine.js";
import { AuditService } from "../audit/audit-service.js";

export interface DecisionCommand {
  proposalId: string;
  proposalVersion: number;
  decision: ApprovalDecisionType;
  comment: string | null;
  actor: AuthenticatedActor;
  correlationId: string;
}

export class RemediationOrchestrator {
  constructor(
    private readonly repository: BackendRepository,
    private readonly simulator: SimulatorExecutionAdapter,
    private readonly verifier: VerificationAdapter,
    private readonly idempotency: IdempotencyStore,
    private readonly events: OperationalEventBus,
    private readonly audit: AuditService,
    private readonly now = () => new Date(),
    private readonly generateId = randomUUID,
  ) {}

  async decide(command: DecisionCommand): Promise<ApprovalDecision> {
    if (!command.actor.permissions.has("remediation:approve")) {
      throw new ApiError({
        code: "AUTH_FORBIDDEN",
        statusCode: 403,
        message: "You do not have permission to perform this action.",
      });
    }
    assertApprovalRole(command.actor);
    const proposal = await this.requireProposal(command.proposalId);
    if (proposal.version !== command.proposalVersion) {
      throw new ApiError({
        code: "PROPOSAL_VERSION_CONFLICT",
        statusCode: 409,
        message: "The remediation proposal version is no longer current.",
      });
    }
    if (proposal.state !== "PENDING_APPROVAL") {
      throw new ApiError({
        code: "INVALID_STATE_TRANSITION",
        statusCode: 409,
        message: "The remediation proposal is not awaiting approval.",
      });
    }
    const role = command.actor.roles.has("ADMINISTRATOR")
      ? "ADMINISTRATOR" as const
      : "INCIDENT_MANAGER" as const;
    const decision: ApprovalDecision = {
      id: this.generateId(),
      proposalId: proposal.id,
      proposalVersion: proposal.version,
      decidedAt: this.now().toISOString(),
      decision: command.decision,
      actorSubject: command.actor.subject,
      actorRole: role,
      comment: command.comment,
    };
    await this.repository.saveDecision(decision);
    await this.repository.updateProposal({
      ...proposal,
      state: command.decision === "APPROVE" ? "APPROVED" : "REJECTED",
    });
    const incident = await this.requireIncident(proposal.incidentId);
    if (command.decision === "REJECT") {
      assertIncidentTransition(incident.status, "REJECTED");
      await this.repository.updateIncident({
        ...incident,
        status: "REJECTED",
        updatedAt: decision.decidedAt,
      });
    } else {
      this.events.publish({
        id: this.generateId(),
        type: "remediation.approved",
        occurredAt: decision.decidedAt,
        correlationId: command.correlationId,
        entityId: proposal.id,
        payload: { proposalVersion: proposal.version },
      });
    }
    await this.audit.record({
      correlationId: command.correlationId,
      actorSubject: command.actor.subject,
      action: command.decision === "APPROVE" ? "remediation.approved" : "remediation.rejected",
      entityType: "REMEDIATION_PROPOSAL",
      entityId: proposal.id,
      payload: { proposalVersion: proposal.version },
    });
    return decision;
  }

  execute(
    proposalId: string,
    idempotencyKey: string,
    actor: AuthenticatedActor,
    correlationId: string,
  ): Promise<RemediationExecution> {
    if (!actor.permissions.has("remediation:execute")) {
      throw new ApiError({
        code: "AUTH_FORBIDDEN",
        statusCode: 403,
        message: "You do not have permission to perform this action.",
      });
    }
    const fingerprint = createHash("sha256").update(proposalId).digest("hex");
    return this.idempotency.execute(
      "remediation.execute",
      idempotencyKey,
      fingerprint,
      async () => {
        const prior = await this.repository.findExecutionByProposal(proposalId);
        if (prior) return prior;
        const proposal = await this.requireProposal(proposalId);
        if (proposal.state !== "APPROVED") {
          throw new ApiError({
            code: "INVALID_STATE_TRANSITION",
            statusCode: 409,
            message: "Only an approved remediation proposal can execute.",
          });
        }
        const incident = await this.requireIncident(proposal.incidentId);
        assertIncidentTransition(incident.status, "REMEDIATING");
        const startedAt = this.now().toISOString();
        await this.repository.updateIncident({ ...incident, status: "REMEDIATING", updatedAt: startedAt });
        this.events.publish({
          id: this.generateId(),
          type: "remediation.executing",
          occurredAt: startedAt,
          correlationId,
          entityId: proposal.id,
          payload: {},
        });
        const result = await this.simulator.execute(proposal, idempotencyKey, correlationId);
        if (!result.ok) {
          throw new ApiError({
            code: "SERVICE_UNAVAILABLE",
            statusCode: 503,
            message: "The simulator is unavailable.",
          });
        }
        await this.repository.saveExecution(result.data);
        await this.repository.updateProposal({ ...proposal, state: "EXECUTED" });
        assertIncidentTransition("REMEDIATING", "VERIFYING");
        await this.repository.updateIncident({
          ...incident,
          status: "VERIFYING",
          updatedAt: result.data.completedAt ?? startedAt,
        });
        await this.audit.record({
          correlationId,
          actorSubject: actor.subject,
          action: "remediation.executed",
          entityType: "REMEDIATION_EXECUTION",
          entityId: result.data.id,
        });
        return result.data;
      },
    );
  }

  async verify(
    incidentId: string,
    execution: RemediationExecution,
    actor: AuthenticatedActor,
    correlationId: string,
  ): Promise<VerificationSnapshot> {
    if (!actor.permissions.has("incidents:verify")) {
      throw new ApiError({ code: "AUTH_FORBIDDEN", statusCode: 403, message: "You do not have permission to perform this action." });
    }
    const incident = await this.requireIncident(incidentId);
    if (incident.status !== "VERIFYING") {
      throw new ApiError({ code: "INVALID_STATE_TRANSITION", statusCode: 409, message: "The incident is not ready for verification." });
    }
    const snapshot = await this.verifier.verify(incident, execution, correlationId);
    await this.repository.saveVerification(snapshot);
    const nextStatus = snapshot.passed ? "RESOLVED" as const : "INVESTIGATING" as const;
    assertIncidentTransition(incident.status, nextStatus);
    await this.repository.updateIncident({
      ...incident,
      status: nextStatus,
      updatedAt: snapshot.createdAt,
      resolvedAt: snapshot.passed ? snapshot.createdAt : null,
    });
    this.events.publish({
      id: this.generateId(),
      type: "verification.updated",
      occurredAt: snapshot.createdAt,
      correlationId,
      entityId: snapshot.id,
      payload: { passed: snapshot.passed },
    });
    if (snapshot.passed) {
      this.events.publish({
        id: this.generateId(),
        type: "incident.resolved",
        occurredAt: snapshot.createdAt,
        correlationId,
        entityId: incident.id,
        payload: {},
      });
    }
    await this.audit.record({
      correlationId,
      actorSubject: actor.subject,
      action: "verification.updated",
      entityType: "INCIDENT",
      entityId: incident.id,
      payload: { passed: snapshot.passed },
    });
    return snapshot;
  }

  private async requireProposal(proposalId: string) {
    const proposal = await this.repository.findProposal(proposalId);
    if (!proposal) throw new ApiError({ code: "NOT_FOUND", statusCode: 404, message: "Remediation proposal was not found." });
    return proposal;
  }

  private async requireIncident(incidentId: string) {
    const incident = await this.repository.findIncident(incidentId);
    if (!incident) throw new ApiError({ code: "NOT_FOUND", statusCode: 404, message: "Incident was not found." });
    return incident;
  }
}
