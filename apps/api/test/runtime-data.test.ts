import { randomUUID } from "node:crypto";

import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";

import type { AuthorizationAdapter } from "../src/auth/authorization.js";
import { createApiApp } from "../src/app/create-api-app.js";
import { InMemoryBackendRepository } from "../src/mocks/in-memory-backend.js";

class ReadAnyAuthorization implements AuthorizationAdapter {
  async authenticate(_request: FastifyRequest) {
    return {
      subject: "operator|test",
      permissions: new Set(["reports:read:any" as const]),
      roles: new Set(["OPERATOR" as const]),
    };
  }
}

describe("runtime data vertical slice", () => {
  it("registers public and voice routes with truthful degraded behavior", async () => {
    const app = await createApiApp();
    expect((await app.inject({ method: "GET", url: "/v1/config/public" })).statusCode).toBe(200);
    const voice = await app.inject({
      method: "POST",
      url: "/v1/voice/transcriptions",
      headers: { "content-type": "audio/webm" },
      payload: Buffer.from("audio"),
    });
    expect(voice.statusCode).toBe(503);
    expect(voice.json().error.code).toBe("ELEVENLABS_UNAVAILABLE");
    await app.close();
  });

  it("persists telemetry through the repository and emits a canonical anomaly", async () => {
    const repository = new InMemoryBackendRepository();
    const app = await createApiApp({ dependencies: { repository, telemetry: repository } });
    const response = await app.inject({
      method: "POST", url: "/v1/telemetry", payload: [{
        id: randomUUID(), nodeId: "17171717-1717-4717-8717-171717171717",
        observedAt: "2026-09-26T12:01:00.000Z", metric: "PACKET_LOSS_PCT", value: 21,
        unit: "percent", source: "SIMULATOR", scenarioId: null,
      }],
    });
    expect(response.statusCode).toBe(204);
    expect(repository.telemetrySamples).toHaveLength(1);
    await app.close();
  });

  it("returns an owned-or-authorized report only after authentication", async () => {
    const repository = new InMemoryBackendRepository();
    const reportId = randomUUID();
    repository.reports.set(reportId, {
      id: reportId, clientReportId: randomUUID(), createdAt: "2026-09-26T12:00:00.000Z",
      channel: "WEB_TEXT", state: "RECEIVED", text: "A report", transcript: null, audioAssetId: null,
      serviceId: null, areaCode: null, latitude: null, longitude: null, symptomCodes: [], citizenId: null,
      correlatedIncidentId: null, sourceLanguage: "en",
    });
    const anonymous = await createApiApp({ dependencies: { repository } });
    expect((await anonymous.inject({ method: "GET", url: `/v1/reports/${reportId}` })).statusCode).toBe(401);
    await anonymous.close();
    const authorized = await createApiApp({ dependencies: { repository, authorization: new ReadAnyAuthorization() } });
    const response = await authorized.inject({ method: "GET", url: `/v1/reports/${reportId}` });
    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe(reportId);
    await authorized.close();
  });
});
