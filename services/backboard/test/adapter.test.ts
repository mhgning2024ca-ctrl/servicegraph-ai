import { describe, expect, it } from "vitest";
import { BackboardAdapter } from "../src/adapter.js";
import {
  DeterministicBackboardTransport,
  NODE17_MEMORY_FIXTURE,
} from "../src/mock.js";

const lookup = {
  incidentId: "incident-2048",
  evidenceSummary: "NODE-17 packet loss",
  limit: 1,
  correlationId: "correlation-1",
} as const;

describe("BackboardAdapter", () => {
  it("is explicitly unavailable without an approved transport", async () => {
    const adapter = new BackboardAdapter({
      apiKey: undefined,
      projectId: undefined,
    });
    expect(adapter.health()).toBe("UNAVAILABLE");
    await expect(adapter.retrieve(lookup)).resolves.toMatchObject({
      ok: false,
      errorCode: "BACKBOARD_UNAVAILABLE",
      retryable: false,
    });
  });

  it("normalizes and bounds deterministic memory", async () => {
    const adapter = new BackboardAdapter({
      apiKey: "test-only",
      projectId: "test-project",
      transport: new DeterministicBackboardTransport([
        ...NODE17_MEMORY_FIXTURE,
        { referenceId: "second", summary: "Second record." },
      ]),
    });
    const result = await adapter.retrieve(lookup);
    expect(result).toMatchObject({
      ok: true,
      provider: "BACKBOARD",
      data: NODE17_MEMORY_FIXTURE,
    });
  });

  it("rejects invalid provider payloads as degraded", async () => {
    const adapter = new BackboardAdapter({
      apiKey: "test-only",
      projectId: "test-project",
      transport: { retrieve: async () => [{ summary: "missing provenance" }] },
    });
    await expect(adapter.retrieve(lookup)).resolves.toMatchObject({
      ok: false,
      errorCode: "BACKBOARD_DEGRADED",
      retryable: true,
    });
  });
});
