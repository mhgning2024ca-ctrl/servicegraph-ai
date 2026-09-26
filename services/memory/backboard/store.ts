import type { IntegrationResult } from "@servicegraph/ai";
import { z } from "zod";
import type { BackboardRequester } from "./client.js";
const storeResponseSchema = z.union([z.object({ memory_id: z.string().min(1) }).passthrough().transform(({ memory_id }) => ({ memoryId: memory_id })), z.object({ id: z.string().min(1) }).passthrough().transform(({ id }) => ({ memoryId: id }))]);
export type StoreMemoryRequest = Readonly<{ content: string; metadata: Record<string, string | number | boolean>; correlationId: string }>;
export async function storeMemory(client: BackboardRequester, request: StoreMemoryRequest): Promise<IntegrationResult<{ memoryId: string }>> {
  if (!request.content) return { ok: false, errorCode: "BACKBOARD_INVALID_REQUEST", retryable: false, provider: "BACKBOARD", durationMs: 0 };
  const result = await client.request(`/assistants/${encodeURIComponent(client.assistantId)}/memories`, { content: request.content, metadata: request.metadata }, request.correlationId);
  if (!result.ok) return result;
  const parsed = storeResponseSchema.safeParse(result.data);
  if (!parsed.success) return { ok: false, errorCode: "BACKBOARD_INVALID_RESPONSE", retryable: false, provider: "BACKBOARD", durationMs: result.durationMs };
  return { ok: true, data: parsed.data, provider: "BACKBOARD", durationMs: result.durationMs };
}
