import { describe, expect, it, vi } from "vitest";
import { GeminiClient, type GeminiSdk } from "../gemini/client.js";
import { deterministicRootCauseMock } from "../src/gemini/mock.js";
import { evidencePacketFixture } from "./fixtures.js";

function sdkReturning(text: string): GeminiSdk {
  return { models: { generateContent: vi.fn().mockResolvedValue({ text }) } };
}

describe("GeminiClient", () => {
  it("returns explicit unavailable state without credentials", async () => {
    const client = new GeminiClient({ apiKey: undefined });
    expect(client.health()).toBe("UNAVAILABLE");
    await expect(client.analyzeRootCause({ packet: evidencePacketFixture, correlationId: "correlation-1" }))
      .resolves.toMatchObject({ ok: false, errorCode: "AI_UNAVAILABLE" });
  });

  it("uses the canonical documented model by default", async () => {
    const valid = deterministicRootCauseMock(evidencePacketFixture);
    if (!valid.ok) throw new Error("fixture must succeed");
    const sdk = sdkReturning(JSON.stringify(valid.data));
    const client = new GeminiClient({ apiKey: "test-only", sdk });
    await client.analyzeRootCause({ packet: evidencePacketFixture, correlationId: "correlation-1" });
    expect(sdk.models.generateContent).toHaveBeenCalledWith(expect.objectContaining({ model: "gemini-3.8-flash" }));
  });

  it("rejects model output referencing unknown evidence", async () => {
    const sdk = sdkReturning(JSON.stringify({
      label: "NODE-17 degradation", targetNodeId: "node-17-id", confidence: 0.95,
      rationale: "Unsupported evidence.", evidenceIds: ["invented-id"], assumptions: [], alternativeHypotheses: [],
    }));
    const client = new GeminiClient({ apiKey: "test-only", model: "test-model", sdk });
    await expect(client.analyzeRootCause({ packet: evidencePacketFixture, correlationId: "correlation-1" }))
      .resolves.toMatchObject({ ok: false, errorCode: "AI_INVALID_OUTPUT" });
  });

  it("validates output and preserves exact cited evidence provenance", async () => {
    const valid = deterministicRootCauseMock(evidencePacketFixture);
    if (!valid.ok) throw new Error("fixture must succeed");
    const client = new GeminiClient({
      apiKey: "test-only", model: "test-model", sdk: sdkReturning(JSON.stringify(valid.data)),
      now: vi.fn<() => Date>().mockReturnValueOnce(new Date("2026-09-26T06:00:00Z")).mockReturnValueOnce(new Date("2026-09-26T06:00:01Z")),
    });
    const result = await client.analyzeRootCause({ packet: evidencePacketFixture, correlationId: "correlation-1" });
    expect(result).toMatchObject({ ok: true, data: { provenance: {
      promptVersion: "root-cause.v1", modelName: "test-model", correlationId: "correlation-1",
      validationOutcome: "VALID", evidenceReferences: ["report-1", "telemetry-1"],
    } } });
  });

  it("performs at most one transient retry", async () => {
    const valid = deterministicRootCauseMock(evidencePacketFixture);
    if (!valid.ok) throw new Error("fixture must succeed");
    const generateContent = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("rate limited"), { status: 429 }))
      .mockResolvedValueOnce({ text: JSON.stringify(valid.data) });
    const client = new GeminiClient({ apiKey: "test-only", sdk: { models: { generateContent } } });
    expect((await client.analyzeRootCause({ packet: evidencePacketFixture, correlationId: "correlation-1" })).ok).toBe(true);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("validates classification and bilingual communication outputs", async () => {
    const classifier = new GeminiClient({ apiKey: "test-only", sdk: sdkReturning('{"symptomCodes":["INTERMITTENT_CONNECTIVITY"]}') });
    expect((await classifier.classifyReport({ text: "Cuts out", sourceLanguage: "en", correlationId: "c" })).ok).toBe(true);

    const communicator = new GeminiClient({ apiKey: "test-only", sdk: sdkReturning('{"language":"fr","text":"Incident en cours.","evidenceIds":["report-1"]}') });
    expect((await communicator.draftCommunication({ packet: evidencePacketFixture, language: "fr", correlationId: "c" })).ok).toBe(true);
  });
});
