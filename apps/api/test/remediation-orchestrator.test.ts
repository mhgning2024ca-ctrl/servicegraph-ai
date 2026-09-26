import { randomUUID } from "node:crypto";

import type {
  IncidentSummary,
  RemediationExecution,
  RemediationProposal,
  VerificationSnapshot,
} from "@servicegraph/contracts";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedActor } from "../src/auth/authorization.js";
import { InMemoryBackendRepository } from "../src/mocks/in-memory-backend.js";
import { AuditService } from "../src/modules/audit/audit-service.js";
import { RemediationOrchestrator } from "../src/modules/remediation/remediation-orchestrator.js";
import type {
  SimulatorExecutionAdapter,
  VerificationAdapter,
} from "../src/ports/backend-ports.js";
import { InMemoryOperationalEventBus } from "../src/realtime/operational-event-bus.js";
import { InMemoryIdempotencyStore } from "../src/shared/idempotency.js";

const incidentId = "11111111-1111-4111-8111-111111111111";
const proposalId = "22222222-2222-4222-8222-222222222222";
const executionId = "33333333-3333-4333-8333-333333333333";
const nodeId = "17171717-1717-4717-8717-171717171717";
const correlationId = "55555555-5555-4555-8555-555555555555";
const timestamp = "2026-09-26T12:00:00.000Z";

function incident(): IncidentSummary {
  return {
    id: incidentId,
    incidentNumber: "INC-2048",
    title: "NODE-17 degradation",
    status: "AWAITING_APPROVAL",
    severity: "MAJOR",
    createdAt: timestamp,
    updatedAt: timestamp,
    startedAt: timestamp,
    resolvedAt: null,
    affectedUsersEstimate: 1200,
    affectedServiceIds: [],
    affectedAreaCodes: ["OTT-CENTRETOWN"],
    probableRootNodeId: nodeId,
    rootCauseConfidence: 0.94,
  };
}

function proposal(): RemediationProposal {
  return {
    id: proposalId,
    incidentId,
    version: 1,
    createdAt: timestamp,
    createdBy: "GEMINI",
    actionType: "REROUTE_TRAFFIC",
    targetNodeId: nodeId,
    parameters: {},
    rationale: "Reroute around degraded NODE-17.",
    expectedEffect: "Packet loss returns below threshold.",
    risk: "LOW",
    evidenceIds: [],
    state: "PENDING_APPROVAL",
  };
}

const manager: AuthenticatedActor = {
  subject: "auth0|manager",
  permissions: new Set(["remediation:approve", "remediation:execute", "incidents:verify"]),
  roles: new Set(["INCIDENT_MANAGER"]),
};

function setup() {
  const repository = new InMemoryBackendRepository();
  repository.incidents.set(incidentId, incident());
  repository.proposals.set(proposalId, proposal());
  const execution: RemediationExecution = {
    id: executionId,
    proposalId,
    startedAt: timestamp,
    completedAt: "2026-09-26T12:01:00.000Z",
    state: "SUCCEEDED",
    simulatorActionId: "sim-action-1",
    resultSummary: "Simulated traffic rerouted.",
  };
  const simulator: SimulatorExecutionAdapter = {
    execute: vi.fn(async () => ({ ok: true as const, data: execution, provider: "NETWORK_SIMULATOR", durationMs: 3 })),
  };
  const verifier: VerificationAdapter = {
    verify: vi.fn(async (): Promise<VerificationSnapshot> => ({
      id: randomUUID(),
      incidentId,
      executionId,
      createdAt: "2026-09-26T12:02:00.000Z",
      windowStart: timestamp,
      windowEnd: "2026-09-26T12:02:00.000Z",
      passed: true,
      checks: [{ metric: "PACKET_LOSS_PCT", before: 21, after: 0.2, threshold: 1, passed: true }],
    })),
  };
  const orchestrator = new RemediationOrchestrator(
    repository,
    simulator,
    verifier,
    new InMemoryIdempotencyStore(),
    new InMemoryOperationalEventBus(),
    new AuditService(repository),
  );
  return { repository, simulator, orchestrator };
}

describe("RemediationOrchestrator", () => {
  it("rejects approval without the required human role", async () => {
    const { orchestrator } = setup();
    const operator: AuthenticatedActor = {
      subject: "auth0|operator",
      permissions: new Set(["remediation:approve"]),
      roles: new Set(["OPERATOR"]),
    };

    await expect(orchestrator.decide({
      proposalId,
      proposalVersion: 1,
      decision: "APPROVE",
      comment: null,
      actor: operator,
      correlationId,
    })).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects stale proposal versions", async () => {
    const { orchestrator } = setup();
    await expect(orchestrator.decide({
      proposalId,
      proposalVersion: 2,
      decision: "APPROVE",
      comment: null,
      actor: manager,
      correlationId,
    })).rejects.toMatchObject({ code: "PROPOSAL_VERSION_CONFLICT" });
  });

  it("approves, executes once, verifies, and resolves only after passed telemetry", async () => {
    const { repository, simulator, orchestrator } = setup();
    await orchestrator.decide({
      proposalId,
      proposalVersion: 1,
      decision: "APPROVE",
      comment: "Approved for simulator execution.",
      actor: manager,
      correlationId,
    });
    const first = await orchestrator.execute(proposalId, "execution-key", manager, correlationId);
    const replay = await orchestrator.execute(proposalId, "execution-key", manager, correlationId);
    expect(replay).toEqual(first);
    expect(simulator.execute).toHaveBeenCalledTimes(1);
    expect(repository.incidents.get(incidentId)?.status).toBe("VERIFYING");

    await orchestrator.verify(incidentId, first, manager, correlationId);
    expect(repository.incidents.get(incidentId)?.status).toBe("RESOLVED");
    expect(repository.auditEvents.map(({ action }) => action)).toEqual([
      "remediation.approved",
      "remediation.executed",
      "verification.updated",
    ]);
  });
});
