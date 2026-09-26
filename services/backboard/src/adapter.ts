import type {
  IntegrationHealth,
  IntegrationResult,
} from "@servicegraph/ai";
import { z } from "zod";

const PROVIDER = "BACKBOARD";

const memoryRecordSchema = z
  .object({
    referenceId: z.string().min(1),
    summary: z.string().min(1),
  })
  .strict();

const memoryRecordsSchema = z.array(memoryRecordSchema);

export type BackboardMemoryRecord = z.infer<typeof memoryRecordSchema>;

export type BackboardLookup = Readonly<{
  incidentId: string;
  evidenceSummary: string;
  limit: number;
  correlationId: string;
}>;

export interface BackboardTransport {
  retrieve(
    request: BackboardLookup,
    signal: AbortSignal,
  ): Promise<unknown>;
}

export type BackboardAdapterConfig = Readonly<{
  apiKey: string | undefined;
  projectId: string | undefined;
  transport?: BackboardTransport;
  timeoutMs?: number;
}>;

function elapsedSince(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

function isValidLookup(request: BackboardLookup): boolean {
  return (
    request.incidentId.length > 0 &&
    request.correlationId.length > 0 &&
    Number.isSafeInteger(request.limit) &&
    request.limit >= 0
  );
}

/**
 * Normalizes provider memory into the canonical historical-context shape.
 * A live transport is intentionally injected: no undocumented Backboard API
 * endpoint or SDK contract is guessed here.
 */
export class BackboardAdapter {
  private readonly timeoutMs: number;

  constructor(private readonly config: BackboardAdapterConfig) {
    this.timeoutMs = config.timeoutMs ?? 15_000;
  }

  health(): IntegrationHealth {
    if (!this.config.apiKey || !this.config.projectId || !this.config.transport) {
      return "UNAVAILABLE";
    }
    return "AVAILABLE";
  }

  async retrieve(
    request: BackboardLookup,
  ): Promise<IntegrationResult<BackboardMemoryRecord[]>> {
    const startedAt = Date.now();
    if (!isValidLookup(request)) {
      return {
        ok: false,
        errorCode: "BACKBOARD_INVALID_REQUEST",
        retryable: false,
        provider: PROVIDER,
        durationMs: elapsedSince(startedAt),
      };
    }

    if (this.health() === "UNAVAILABLE") {
      return {
        ok: false,
        errorCode: "BACKBOARD_UNAVAILABLE",
        retryable: false,
        provider: PROVIDER,
        durationMs: elapsedSince(startedAt),
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const raw = await this.config.transport!.retrieve(request, controller.signal);
      const records = memoryRecordsSchema.parse(raw).slice(0, request.limit);
      return {
        ok: true,
        data: records,
        provider: PROVIDER,
        durationMs: elapsedSince(startedAt),
      };
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      return {
        ok: false,
        errorCode: timedOut ? "BACKBOARD_TIMEOUT" : "BACKBOARD_DEGRADED",
        retryable: true,
        provider: PROVIDER,
        durationMs: elapsedSince(startedAt),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
