import type { FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";

import { GeminiClient, type GeminiSdk } from "@servicegraph/ai";
import { DeterministicBackboardRequester } from "@servicegraph/backboard";

import type { AuthorizationAdapter } from "../src/auth/authorization.js";
import { createApiApp } from "../src/app/create-api-app.js";
import {
  DEMO_INCIDENT_ID,
  DEMO_NODE17_ID,
  createSeededDemoRepository,
} from "../src/mocks/demo-runtime.js";
import { RuntimeAiIncidentAnalysisAdapter } from "../src/modules/incidents/runtime-ai-adapter.js";
import { InMemoryOperationalEventBus } from "../src/realtime/operational-event-bus.js";

const correlationId = "5bf4d3c1-0d49-4e21-aa91-e248d4f22da9";
const fixedNow = () => new Date("2026-09-26T09:00:00Z");

class AnalyzeAuthorization implements AuthorizationAdapter {
  async authenticate(_request: FastifyRequest) {
    return {
      subject: "operator|runtime-ai-test",
      permissions: new Set(["incidents:analyze", "incidents:read"] as const),
      roles: new Set(["OPERATOR"] as const),
    };
  }
}

describe("RuntimeAiIncidentAnalysisAdapter", () => {
  it("builds a bounded packet from repository evidence/graph, retrieves Backboard context, and persists validated Gemini analysis", async () => {
    const repository = createSeededDemoRepository(fixedNow());
    let capturedRequest: Parameters<GeminiClient["analyzeRootCause"]>[0] | undefined;
    const sdk: GeminiSdk = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            label: "NODE-17 packet-loss degradation",
            targetNodeId: DEMO_NODE17_ID,
            confidence: 0.94,
            rationale: "Bounded reports, topology, telemetry, and prior runbook context converge on NODE-17.",
            evidenceIds: [
              "eeeeeeee-0001-4000-8000-000000000001",
              "eeeeeeee-0002-4000-8000-000000000002",
            ],
            assumptions: ["Backboard memory is advisory rather than current telemetry."],
            alternativeHypotheses: [],
          }),
        }),
      },
    };
    const client = new GeminiClient({
      apiKey: "test-only",
      model: "gemini-test",
      sdk,
      now: fixedNow,
    });
    const gemini: Pick<GeminiClient, "analyzeRootCause"> = {
      analyzeRootCause: async (request) => {
        capturedRequest = request;
        return client.analyzeRootCause(request);
      },
    };
    const adapter = new RuntimeAiIncidentAnalysisAdapter({
      repository,
      gemini,
      backboard: new DeterministicBackboardRequester(),
      now: fixedNow,
      limits: {
        services: 1,
        candidateNodes: 1,
        reports: 1,
        telemetryAnomalies: 1,
        topologyEvidence: 1,
        historicalContext: 1,
      },
    });
    const events = new InMemoryOperationalEventBus();
    const app = await createApiApp({
      dependencies: {
        repository,
        authorization: new AnalyzeAuthorization(),
        incidentAnalysis: adapter,
        events,
      },
      generateCorrelationId: () => correlationId,
    });

    const response = await app.inject({
      method: "POST",
      url: `/v1/incidents/${DEMO_INCIDENT_ID}/analyze`,
      payload: {},
    });

    expect(response.statusCode).toBe(202);
    expect(capturedRequest?.packet).toMatchObject({
      incidentId: DEMO_INCIDENT_ID,
      candidateNodes: [{ id: DEMO_NODE17_ID, code: "NODE-17" }],
      reports: [{ id: "eeeeeeee-0001-4000-8000-000000000001" }],
      telemetryAnomalies: [{ id: "eeeeeeee-0002-4000-8000-000000000002" }],
      historicalContext: [{ source: "BACKBOARD" }],
    });
    expect(capturedRequest?.packet.historicalContext).toHaveLength(1);
    expect(sdk.models.generateContent).toHaveBeenCalledTimes(1);
    expect(repository.evidence.size).toBe(4);
    expect(repository.hypotheses.size).toBe(1);
    expect(repository.blastRadii.size).toBe(1);
    expect([...repository.hypotheses.values()][0]).toMatchObject({
      modelProvider: "GEMINI",
      modelName: "gemini-test",
      promptVersion: "root-cause.v1",
      evidenceIds: [
        "eeeeeeee-0001-4000-8000-000000000001",
        "eeeeeeee-0002-4000-8000-000000000002",
      ],
    });
    expect([...repository.blastRadii.values()][0]).toMatchObject({
      affectedNodeIds: [DEMO_NODE17_ID],
      affectedUsersEstimate: 1284,
    });
    expect(repository.auditEvents).toHaveLength(1);
    expect(events.recent().map((event) => event.type)).toContain("hypothesis.created");
    await app.close();
  });

  it("returns an explicit degraded provider result and never persists a fabricated hypothesis", async () => {
    const repository = createSeededDemoRepository(fixedNow());
    const adapter = new RuntimeAiIncidentAnalysisAdapter({
      repository,
      gemini: {
        analyzeRootCause: async () => ({
          ok: false as const,
          provider: "GEMINI",
          errorCode: "AI_INVALID_OUTPUT",
          retryable: false,
          durationMs: 1,
        }),
      },
      backboard: new DeterministicBackboardRequester(),
      now: fixedNow,
    });
    const events = new InMemoryOperationalEventBus();
    const app = await createApiApp({
      dependencies: {
        repository,
        authorization: new AnalyzeAuthorization(),
        incidentAnalysis: adapter,
        events,
      },
      generateCorrelationId: () => correlationId,
    });

    const response = await app.inject({
      method: "POST",
      url: `/v1/incidents/${DEMO_INCIDENT_ID}/analyze`,
      payload: {},
    });

    expect(response.statusCode).toBe(503);
    expect(response.json().error).toMatchObject({
      code: "AI_INVALID_OUTPUT",
      correlationId,
    });
    expect(repository.hypotheses.size).toBe(0);
    expect(repository.blastRadii.size).toBe(0);
    expect(events.recent()).toContainEqual(expect.objectContaining({
      type: "integration.degraded",
      payload: { provider: "GEMINI", errorCode: "AI_INVALID_OUTPUT" },
    }));
    await app.close();
  });

  it("does not substitute a deterministic hypothesis when the live Gemini composition has no credentials", async () => {
    const repository = createSeededDemoRepository(fixedNow());
    const app = await createApiApp({
      dependencies: {
        repository,
        authorization: new AnalyzeAuthorization(),
      },
      generateCorrelationId: () => correlationId,
    });

    const response = await app.inject({
      method: "POST",
      url: `/v1/incidents/${DEMO_INCIDENT_ID}/analyze`,
      payload: {},
    });

    expect(response.statusCode).toBe(503);
    expect(response.json().error).toMatchObject({ code: "AI_UNAVAILABLE", correlationId });
    expect(repository.hypotheses.size).toBe(0);
    expect(repository.blastRadii.size).toBe(0);
    await app.close();
  });
});
