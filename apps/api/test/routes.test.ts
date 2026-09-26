import { randomUUID } from "node:crypto";

import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";

import type { AuthorizationAdapter } from "../src/auth/authorization.js";
import { createApiApp } from "../src/app/create-api-app.js";
import { InMemoryBackendRepository } from "../src/mocks/in-memory-backend.js";

const correlationId = "5bf4d3c1-0d49-4e21-aa91-e248d4f22da9";

const reportBody = {
  clientReportId: "4b6a4537-2e9c-4e80-94e0-108db1b544fe",
  channel: "WEB_TEXT",
  text: "My internet has been cutting out for 20 minutes.",
  serviceId: null,
  areaCode: "OTT-CENTRETOWN",
  latitude: null,
  longitude: null,
  sourceLanguage: "en",
} as const;

class StaticAuthorization implements AuthorizationAdapter {
  constructor(private readonly allowed: boolean) {}

  async authenticate(_request: FastifyRequest) {
    return {
      subject: "operator|test",
      permissions: new Set(this.allowed ? ["incidents:read" as const] : []),
      roles: new Set(["OPERATOR" as const]),
    };
  }
}

describe("frozen HTTP routes", () => {
  it("reports liveness and dependency readiness without inventing a body", async () => {
    const repository = new InMemoryBackendRepository();
    const app = await createApiApp({ dependencies: { repository } });

    expect((await app.inject({ method: "GET", url: "/v1/health/live" })).statusCode).toBe(204);
    expect((await app.inject({ method: "GET", url: "/v1/health/ready" })).statusCode).toBe(204);
    repository.setReady(false);
    const degraded = await app.inject({ method: "GET", url: "/v1/health/ready" });
    expect(degraded.statusCode).toBe(503);
    expect(degraded.json().error.code).toBe("SERVICE_UNAVAILABLE");
    await app.close();
  });

  it("creates and replays an idempotent report with the canonical response", async () => {
    const repository = new InMemoryBackendRepository();
    const app = await createApiApp({
      generateCorrelationId: () => correlationId,
      dependencies: { repository },
    });
    const key = randomUUID();
    const request = {
      method: "POST" as const,
      url: "/v1/reports",
      headers: { "idempotency-key": key },
      payload: reportBody,
    };

    const first = await app.inject(request);
    const replay = await app.inject(request);

    expect(first.statusCode).toBe(201);
    expect(replay.statusCode).toBe(201);
    expect(replay.json()).toEqual(first.json());
    expect(first.json().report.state).toBe("RECEIVED");
    expect(repository.reports.size).toBe(1);
    expect(repository.auditEvents).toHaveLength(1);
    await app.close();
  });

  it("rejects an idempotency key reused with a different report", async () => {
    const app = await createApiApp({ generateCorrelationId: () => correlationId });
    const key = randomUUID();
    await app.inject({
      method: "POST",
      url: "/v1/reports",
      headers: { "idempotency-key": key },
      payload: reportBody,
    });
    const conflict = await app.inject({
      method: "POST",
      url: "/v1/reports",
      headers: { "idempotency-key": key },
      payload: { ...reportBody, text: "Different complaint" },
    });

    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe("IDEMPOTENCY_CONFLICT");
    await app.close();
  });

  it("rejects invalid report fields with the canonical error envelope", async () => {
    const app = await createApiApp({ generateCorrelationId: () => correlationId });
    const response = await app.inject({
      method: "POST",
      url: "/v1/reports",
      headers: { "idempotency-key": randomUUID() },
      payload: { ...reportBody, channel: "EMAIL" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatchObject({
      code: "VALIDATION_ERROR",
      correlationId,
    });
    await app.close();
  });

  it("fails closed for incident graph access and permits authorized reads", async () => {
    const incidentId = randomUUID();
    const repository = new InMemoryBackendRepository();
    repository.graphs.set(incidentId, { nodes: [], edges: [] });

    const unauthenticated = await createApiApp({ dependencies: { repository } });
    expect((await unauthenticated.inject({ method: "GET", url: `/v1/incidents/${incidentId}/graph` })).statusCode).toBe(401);
    await unauthenticated.close();

    const forbidden = await createApiApp({
      dependencies: { repository, authorization: new StaticAuthorization(false) },
    });
    expect((await forbidden.inject({ method: "GET", url: `/v1/incidents/${incidentId}/graph` })).statusCode).toBe(403);
    await forbidden.close();

    const authorized = await createApiApp({
      dependencies: { repository, authorization: new StaticAuthorization(true) },
    });
    const response = await authorized.inject({ method: "GET", url: `/v1/incidents/${incidentId}/graph` });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ nodes: [], edges: [] });
    await authorized.close();
  });
});
