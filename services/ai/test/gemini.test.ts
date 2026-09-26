import { describe, expect, it, vi } from "vitest";
import { GeminiAdapter } from "../src/gemini/adapter.js";
import { deterministicRootCauseMock } from "../src/gemini/mock.js";
import { evidencePacketFixture } from "./fixtures.js";

describe("GeminiAdapter", () => {
  it("returns explicit unavailable state without credentials", async () => {
    const adapter = new GeminiAdapter({ apiKey: undefined, model: undefined });
    expect(adapter.health()).toBe("UNAVAILABLE");
    await expect(
      adapter.analyzeRootCause({
        packet: evidencePacketFixture,
        correlationId: "correlation-1",
      }),
    ).resolves.toMatchObject({ ok: false, errorCode: "AI_UNAVAILABLE" });
  });

  it("rejects model output referencing unknown evidence", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      label: "NODE-17 degradation",
                      targetNodeId: "node-17-id",
                      confidence: 0.95,
                      rationale: "Unsupported evidence.",
                      evidenceIds: ["invented-id"],
                      assumptions: [],
                      alternativeHypotheses: [],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const adapter = new GeminiAdapter({
      apiKey: "test-only",
      model: "test-model",
      fetchImpl,
    });
    const result = await adapter.analyzeRootCause({
      packet: evidencePacketFixture,
      correlationId: "correlation-1",
    });
    expect(result).toMatchObject({ ok: false, errorCode: "AI_INVALID_OUTPUT" });
  });

  it("validates output and preserves provenance", async () => {
    const validOutput = deterministicRootCauseMock(evidencePacketFixture);
    if (!validOutput.ok) throw new Error("fixture must be successful");
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: JSON.stringify(validOutput.data) }] } },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const now = vi
      .fn<() => Date>()
      .mockReturnValueOnce(new Date("2026-09-26T06:00:00Z"))
      .mockReturnValueOnce(new Date("2026-09-26T06:00:01Z"));
    const adapter = new GeminiAdapter({
      apiKey: "test-only",
      model: "test-model",
      fetchImpl,
      now,
    });
    const result = await adapter.analyzeRootCause({
      packet: evidencePacketFixture,
      correlationId: "correlation-1",
    });
    expect(result).toMatchObject({
      ok: true,
      provider: "GEMINI",
      data: {
        provenance: {
          promptVersion: "root-cause.v1",
          modelName: "test-model",
          correlationId: "correlation-1",
          validationOutcome: "VALID",
        },
      },
    });
  });

  it("performs at most one transient retry", async () => {
    const validOutput = deterministicRootCauseMock(evidencePacketFixture);
    if (!validOutput.ok) throw new Error("fixture must be successful");
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: JSON.stringify(validOutput.data) }] } },
            ],
          }),
          { status: 200 },
        ),
      );
    const adapter = new GeminiAdapter({
      apiKey: "test-only",
      model: "test-model",
      fetchImpl,
    });
    const result = await adapter.analyzeRootCause({
      packet: evidencePacketFixture,
      correlationId: "correlation-1",
    });
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
