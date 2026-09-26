import { describe, expect, it, vi } from "vitest";
import { BACKBOARD_BASE_URL, BackboardClient } from "../client.js";
import { DeterministicBackboardRequester } from "../mock.js";
import { searchMemories } from "../search.js";
import { storeMemory } from "../store.js";

describe("Backboard memory", () => {
  it("is explicitly unavailable without credentials", async () => {
    const client = new BackboardClient({ apiKey: undefined, assistantId: undefined });
    expect(client.health()).toBe("UNAVAILABLE");
    await expect(client.request("/ignored", {}, "correlation-1")).resolves.toMatchObject({ ok: false, errorCode: "BACKBOARD_UNAVAILABLE" });
  });
  it("uses the official base API, X-API-Key and assistant path", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ memories: [] }), { status: 200 }));
    const client = new BackboardClient({ apiKey: "test-only", assistantId: "assistant-1", fetchImpl });
    await searchMemories(client, { query: "NODE-17", limit: 5, correlationId: "correlation-1" });
    expect(fetchImpl).toHaveBeenCalledWith(`${BACKBOARD_BASE_URL}/assistants/assistant-1/memories/search`, expect.objectContaining({ headers: expect.objectContaining({ "X-API-Key": "test-only" }) }));
  });
  it("normalizes deterministic search memory with provenance", async () => {
    await expect(searchMemories(new DeterministicBackboardRequester(), { query: "NODE-17", limit: 1, correlationId: "c" })).resolves.toMatchObject({ ok: true, data: [{ source: "BACKBOARD", referenceId: "historical-incident-node17" }] });
  });
  it("stores through the canonical assistant memory endpoint", async () => {
    await expect(storeMemory(new DeterministicBackboardRequester(), { content: "Runbook", metadata: { incident: "INC-2048" }, correlationId: "c" })).resolves.toMatchObject({ ok: true, data: { memoryId: "stored-memory-id" } });
  });
  it("rejects malformed provider payloads", async () => {
    const client = new DeterministicBackboardRequester([{ summary: "missing id" }]);
    await expect(searchMemories(client, { query: "x", limit: 1, correlationId: "c" })).resolves.toMatchObject({ ok: false, errorCode: "BACKBOARD_INVALID_RESPONSE" });
  });
});
