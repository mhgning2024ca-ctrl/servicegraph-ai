import { randomUUID } from "node:crypto";

import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";

import type { AuthorizationAdapter } from "../src/auth/authorization.js";
import { createApiApp } from "../src/app/create-api-app.js";
import {
  createSeededDemoRepository,
  DeterministicIncidentAnalysisAdapter,
} from "../src/mocks/demo-runtime.js";

class IncidentManagerAuthorization implements AuthorizationAdapter {
  async authenticate(_request: FastifyRequest) {
    return {
      subject: "test|incident-manager",
      permissions: new Set([
        "reports:read:any",
        "incidents:read",
        "incidents:analyze",
        "incidents:update",
        "remediation:propose",
        "remediation:approve",
        "remediation:execute",
        "incidents:verify",
        "communications:create",
        "simulator:control",
        "audit:read",
      ] as const),
      roles: new Set(["INCIDENT_MANAGER"] as const),
    };
  }
}

describe("canonical ServiceGraph demo loop", () => {
  it("runs report-to-safe-resolution through the frozen HTTP surface", async () => {
    const repository = createSeededDemoRepository(new Date("2026-09-26T08:00:00Z"));
    const app = await createApiApp({
      dependencies: {
        repository,
        authorization: new IncidentManagerAuthorization(),
        // The canonical end-to-end fixture intentionally opts into mock mode;
        // runtime composition otherwise returns an explicit provider failure.
        incidentAnalysis: new DeterministicIncidentAnalysisAdapter(),
      },
      generateCorrelationId: () => "5bf4d3c1-0d49-4e21-aa91-e248d4f22da9",
    });

    const scenario = await app.inject({
      method: "POST",
      url: "/v1/simulator/scenarios/node17-degradation/start",
      payload: { speed: 60 },
    });
    expect(scenario.statusCode).toBe(201);

    const report = await app.inject({
      method: "POST",
      url: "/v1/reports",
      headers: { "idempotency-key": randomUUID() },
      payload: {
        clientReportId: randomUUID(),
        channel: "WEB_TEXT",
        text: "Internet is dropping in Centretown.",
        serviceId: null,
        areaCode: "OTT-CENTRETOWN",
        latitude: null,
        longitude: null,
        sourceLanguage: "en",
      },
    });
    expect(report.statusCode).toBe(201);

    const list = await app.inject({ method: "GET", url: "/v1/incidents?limit=100" });
    expect(list.statusCode).toBe(200);
    const incident = list.json().items.find((item: { incidentNumber: string }) => item.incidentNumber === "INC-2048");
    expect(incident?.id).toBeTruthy();

    const analysis = await app.inject({
      method: "POST",
      url: `/v1/incidents/${incident.id}/analyze`,
      payload: {},
    });
    expect(analysis.statusCode).toBe(202);

    const detail = await app.inject({ method: "GET", url: `/v1/incidents/${incident.id}` });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().rootCauseHypothesis.targetNodeId).toBeTruthy();
    expect(detail.json().rootCauseHypothesis.evidenceIds.length).toBeGreaterThan(0);

    const evidenceResponse = await app.inject({ method: "GET", url: `/v1/incidents/${incident.id}/evidence` });
    expect(evidenceResponse.statusCode).toBe(200);
    const evidenceIds = evidenceResponse.json().evidence.map((item: { id: string }) => item.id);
    expect(evidenceIds.length).toBeGreaterThan(0);

    const proposal = await app.inject({
      method: "POST",
      url: `/v1/incidents/${incident.id}/remediation-proposals`,
      payload: {
        version: 1,
        createdBy: "OPERATOR",
        actionType: "REROUTE_TRAFFIC",
        targetNodeId: detail.json().rootCauseHypothesis.targetNodeId,
        parameters: { scenario: "node17-degradation" },
        rationale: "Reroute simulated traffic away from NODE-17.",
        expectedEffect: "Packet loss and latency return below thresholds.",
        risk: "LOW",
        evidenceIds,
      },
    });
    expect(proposal.statusCode).toBe(201);
    const proposalId = proposal.json().proposal.id;

    const decision = await app.inject({
      method: "POST",
      url: `/v1/remediation-proposals/${proposalId}/decision`,
      payload: { proposalVersion: 1, decision: "APPROVE", comment: "Approved in canonical test." },
    });
    expect(decision.statusCode).toBe(200);

    const key = randomUUID();
    const firstExecution = await app.inject({
      method: "POST",
      url: `/v1/remediation-proposals/${proposalId}/execute`,
      headers: { "idempotency-key": key },
      payload: {},
    });
    const replayExecution = await app.inject({
      method: "POST",
      url: `/v1/remediation-proposals/${proposalId}/execute`,
      headers: { "idempotency-key": key },
      payload: {},
    });
    expect(firstExecution.statusCode).toBe(200);
    expect(replayExecution.statusCode).toBe(200);
    expect(replayExecution.json().execution.id).toBe(firstExecution.json().execution.id);

    const verification = await app.inject({
      method: "POST",
      url: `/v1/incidents/${incident.id}/verify`,
      payload: {},
    });
    expect(verification.statusCode).toBe(200);
    expect(verification.json().verification.passed).toBe(true);

    const communication = await app.inject({
      method: "POST",
      url: `/v1/incidents/${incident.id}/communications`,
      payload: {
        audience: "AFFECTED_USERS",
        language: "fr",
        text: "Le service est rétabli et la récupération a été vérifiée.",
      },
    });
    expect(communication.statusCode).toBe(201);

    const finalDetail = await app.inject({ method: "GET", url: `/v1/incidents/${incident.id}` });
    expect(finalDetail.json().incident.status).toBe("RESOLVED");

    await app.close();
  });

  it("fails closed when protected incident routes have no authorization adapter", async () => {
    const app = await createApiApp({ dependencies: { repository: createSeededDemoRepository() } });
    const response = await app.inject({ method: "GET", url: "/v1/incidents" });
    expect(response.statusCode).toBe(401);
    await app.close();
  });
});
