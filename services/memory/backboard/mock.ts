import type { IntegrationResult } from "@servicegraph/ai";
import type { BackboardRequester } from "./client.js";
export const NODE17_MEMORY_FIXTURE = [{ id: "historical-incident-node17", content: "A prior simulated NODE-17 degradation recovered after approved traffic rerouting.", score: 0.91 }] as const;
export class DeterministicBackboardRequester implements BackboardRequester {
  readonly assistantId = "assistant-test";
  constructor(private readonly memories: readonly unknown[] = NODE17_MEMORY_FIXTURE) {}
  async request(path: string): Promise<IntegrationResult<unknown>> {
    if (path.endsWith("/search")) return { ok: true, data: { memories: structuredClone(this.memories) }, provider: "BACKBOARD_MOCK", durationMs: 0 };
    return { ok: true, data: { memory_id: "stored-memory-id" }, provider: "BACKBOARD_MOCK", durationMs: 0 };
  }
}
