import { randomUUID } from "node:crypto";

import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";

import type { AuthorizationAdapter } from "../src/auth/authorization.js";
import { createApiApp } from "../src/app/create-api-app.js";
import { InMemoryBackendRepository } from "../src/mocks/in-memory-backend.js";
import { InMemoryOperationalEventBus } from "../src/realtime/operational-event-bus.js";

const correlationId = "5bf4d3c1-0d49-4e21-aa91-e248d4f22da9";
const serviceId = "11111111-1111-4111-8111-111111111101";
const nodeId = "17171717-1717-4717-8717-171717171717";

class IncidentReadAuthorization implements AuthorizationAdapter {
  async authenticate(_request: FastifyRequest) {
    return {
      subject: "operator|correlation-test",
      permissions: new Set(["incidents:read" as const]),
      roles: new Set(["OPERATOR" as const]),
    };
  }
}

describe("report correlation post-processing", () => {
  it("creates, retrieves, and subsequently updates a real incident from persisted report, topology, and telemetry evidence", async () => {
    const repository = new InMemoryBackendRepository();
    repository.topologyDependencies.push({
      serviceId,
      nodeId,
      nodeCode: "NODE-17",
      nodeStatus: "DEGRADED",
      areaCode: "OTT-CENTRETOWN",
    });
    await repository.saveTelemetrySamples([{
      id: "aaaaaaaa-0002-4000-8000-000000000002",
      nodeId,
      observedAt: new Date().toISOString(),
      metric: "PACKET_LOSS_PCT",
      value: 21,
      unit: "percent",
      source: "SIMULATOR",
      scenarioId: null,
    }]);
    const events = new InMemoryOperationalEventBus();
    const app = await createApiApp({
      generateCorrelationId: () => correlationId,
      dependencies: {
        repository,
        telemetry: repository,
        events,
        authorization: new IncidentReadAuthorization(),
      },
    });

    const submit = (clientReportId: string, idempotencyKey: string) => app.inject({
      method: "POST",
      url: "/v1/reports",
      headers: { "idempotency-key": idempotencyKey },
      payload: {
        clientReportId,
        channel: "WEB_TEXT",
        text: "Internet drops repeatedly in Centretown.",
        serviceId,
        areaCode: "OTT-CENTRETOWN",
        latitude: null,
        longitude: null,
        sourceLanguage: "en",
      },
    });

    const first = await submit(randomUUID(), randomUUID());
    expect(first.statusCode).toBe(201);
    expect(first.json().report.state).toBe("CORRELATED");
    expect(repository.incidents.size).toBe(1);
    const incident = [...repository.incidents.values()][0]!;
    expect(incident.incidentNumber).not.toBe("INC-2048");
    expect(incident.probableRootNodeId).toBe(nodeId);

    const list = await app.inject({ method: "GET", url: "/v1/incidents?limit=10" });
    expect(list.statusCode).toBe(200);
    expect(list.json().items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: incident.id, incidentNumber: incident.incidentNumber }),
    ]));
    const graph = await app.inject({ method: "GET", url: `/v1/incidents/${incident.id}/graph` });
    expect(graph.statusCode).toBe(200);
    expect(graph.json().nodes.map((node: { category: string }) => node.category)).toEqual(
      expect.arrayContaining(["REPORT", "SERVICE", "INFRASTRUCTURE_NODE", "TELEMETRY_ANOMALY"]),
    );
    expect([...repository.evidence.values()].map((evidence) => evidence.type)).toEqual(
      expect.arrayContaining(["CUSTOMER_REPORT", "TELEMETRY_ANOMALY", "TOPOLOGY"]),
    );
    expect(events.recent().map((event) => event.type)).toEqual(
      expect.arrayContaining(["incident.created", "report.correlated"]),
    );

    const second = await submit(randomUUID(), randomUUID());
    expect(second.statusCode).toBe(201);
    expect(second.json().report.correlatedIncidentId).toBe(incident.id);
    expect(repository.incidents.size).toBe(1);
    expect(events.recent().map((event) => event.type)).toContain("incident.updated");

    await app.close();
  });
});
