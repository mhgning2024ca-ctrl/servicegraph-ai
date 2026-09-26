import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { createApiApp } from "../src/app/create-api-app.js";
import { InMemoryBackendRepository } from "../src/mocks/in-memory-backend.js";
import { InMemoryIdempotencyStore } from "../src/shared/idempotency.js";

describe("backend resilience", () => {
  it("preserves and acknowledges a report when downstream processing fails", async () => {
    const repository = new InMemoryBackendRepository();
    const process = vi.fn(async () => {
      throw new Error("provider unavailable");
    });
    const app = await createApiApp({
      dependencies: { repository, reportPostProcessor: { process } },
    });
    const response = await app.inject({
      method: "POST",
      url: "/v1/reports",
      headers: { "idempotency-key": randomUUID() },
      payload: {
        clientReportId: randomUUID(),
        channel: "WEB_TEXT",
        text: "Service is intermittent.",
        serviceId: null,
        areaCode: "OTT-CENTRETOWN",
        latitude: null,
        longitude: null,
        sourceLanguage: "en",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(repository.reports.size).toBe(1);
    expect(repository.auditEvents.map(({ action }) => action)).toEqual([
      "report.created",
      "report.processing.failed",
    ]);
    await app.close();
  });

  it("rejects a concurrent idempotency key with a different fingerprint", async () => {
    const store = new InMemoryIdempotencyStore();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const first = store.execute("scope", "key", "fingerprint-a", async () => {
      await gate;
      return "created";
    });

    await expect(
      store.execute("scope", "key", "fingerprint-b", async () => "wrong"),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    release();
    await expect(first).resolves.toBe("created");
  });
});
