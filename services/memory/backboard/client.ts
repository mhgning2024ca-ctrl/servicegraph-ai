import type { IntegrationHealth, IntegrationResult } from "@servicegraph/ai";
const PROVIDER = "BACKBOARD";
export const BACKBOARD_BASE_URL = "https://app.backboard.io/api";
type FetchLike = typeof fetch;
export type BackboardClientConfig = Readonly<{ apiKey: string | undefined; assistantId: string | undefined; timeoutMs?: number; fetchImpl?: FetchLike }>;
export interface BackboardRequester { readonly assistantId: string; request(path: string, body: unknown, correlationId: string): Promise<IntegrationResult<unknown>>; }
function elapsed(startedAt: number): number { return Math.max(0, Date.now() - startedAt); }
export class BackboardClient implements BackboardRequester {
  readonly assistantId: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;
  constructor(private readonly config: BackboardClientConfig) { this.assistantId = config.assistantId ?? ""; this.timeoutMs = config.timeoutMs ?? 15_000; this.fetchImpl = config.fetchImpl ?? fetch; }
  health(): IntegrationHealth { return this.config.apiKey && this.assistantId ? "AVAILABLE" : "UNAVAILABLE"; }
  async request(path: string, body: unknown, correlationId: string): Promise<IntegrationResult<unknown>> {
    const startedAt = Date.now();
    if (this.health() === "UNAVAILABLE") return { ok: false, errorCode: "BACKBOARD_UNAVAILABLE", retryable: false, provider: PROVIDER, durationMs: elapsed(startedAt) };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(`${BACKBOARD_BASE_URL}${path}`, { method: "POST", headers: { "content-type": "application/json", "X-API-Key": this.config.apiKey!, "x-servicegraph-correlation-id": correlationId }, body: JSON.stringify(body), signal: controller.signal });
        if (!response.ok) { const retryable = response.status === 408 || response.status === 429 || response.status >= 500; if (retryable && attempt === 0) continue; return { ok: false, errorCode: retryable ? "BACKBOARD_DEGRADED" : "BACKBOARD_PROVIDER_ERROR", retryable, provider: PROVIDER, durationMs: elapsed(startedAt) }; }
        return { ok: true, data: await response.json(), provider: PROVIDER, durationMs: elapsed(startedAt) };
      } catch (error) {
        const retryable = error instanceof Error && (error.name === "AbortError" || error instanceof TypeError); if (retryable && attempt === 0) continue;
        return { ok: false, errorCode: error instanceof Error && error.name === "AbortError" ? "BACKBOARD_TIMEOUT" : "BACKBOARD_DEGRADED", retryable, provider: PROVIDER, durationMs: elapsed(startedAt) };
      } finally { clearTimeout(timeout); }
    }
    return { ok: false, errorCode: "BACKBOARD_DEGRADED", retryable: true, provider: PROVIDER, durationMs: elapsed(startedAt) };
  }
}
export function createBackboardClientFromEnv(environment: NodeJS.ProcessEnv = process.env): BackboardClient { return new BackboardClient({ apiKey: environment.BACKBOARD_API_KEY, assistantId: environment.BACKBOARD_ASSISTANT_ID }); }
