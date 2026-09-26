import type { IntegrationResult } from "@servicegraph/ai";
import { z } from "zod";
import type { BackboardRequester } from "./client.js";
const responseSchema = z.object({ memories: z.array(z.object({ id: z.string().min(1), content: z.string().min(1), score: z.number().nullable().optional() }).passthrough()) }).passthrough();
export type HistoricalMemory = Readonly<{ source: "BACKBOARD"; referenceId: string; summary: string }>;
export type SearchMemoryRequest = Readonly<{ query: string; limit: number; correlationId: string }>;
export async function searchMemories(client: BackboardRequester, request: SearchMemoryRequest): Promise<IntegrationResult<HistoricalMemory[]>> {
  if (!request.query || !Number.isSafeInteger(request.limit) || request.limit < 0 || request.limit > 100) return { ok: false, errorCode: "BACKBOARD_INVALID_REQUEST", retryable: false, provider: "BACKBOARD", durationMs: 0 };
  const result = await client.request(`/assistants/${encodeURIComponent(client.assistantId)}/memories/search`, { query: request.query, limit: request.limit }, request.correlationId);
  if (!result.ok) return result;
  const parsed = responseSchema.safeParse(result.data);
  if (!parsed.success) return { ok: false, errorCode: "BACKBOARD_INVALID_RESPONSE", retryable: false, provider: "BACKBOARD", durationMs: result.durationMs };
  return { ok: true, data: parsed.data.memories.slice(0, request.limit).map((memory) => ({ source: "BACKBOARD", referenceId: memory.id, summary: memory.content })), provider: "BACKBOARD", durationMs: result.durationMs };
}
