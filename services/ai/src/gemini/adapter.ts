import {
  REMEDIATION_PROMPT_VERSION,
  renderRemediationPrompt,
} from "../../prompts/remediation.v1.js";
import {
  ROOT_CAUSE_PROMPT_VERSION,
  renderRootCausePrompt,
} from "../../prompts/root-cause.v1.js";
import type { IntegrationHealth, IntegrationResult } from "../integration-result.js";
import type { EvidencePacket } from "../schemas/evidence-packet.js";
import {
  parseRemediationOutput,
  parseRootCauseOutput,
  type RemediationOutput,
  type RootCauseOutput,
} from "../schemas/outputs.js";
import { remediationJsonSchema, rootCauseJsonSchema } from "./json-schemas.js";

const PROVIDER = "GEMINI";

type FetchLike = typeof fetch;

export type AiProvenance = Readonly<{
  provider: "GEMINI";
  modelName: string;
  promptVersion: string;
  requestTimestamp: string;
  responseTimestamp: string;
  validationOutcome: "VALID";
  evidenceReferences: string[];
  correlationId: string;
}>;

export type ValidatedAiResult<T> = Readonly<{
  output: T;
  provenance: AiProvenance;
}>;

export type GeminiAdapterConfig = Readonly<{
  apiKey: string | undefined;
  model: string | undefined;
  timeoutMs?: number;
  maxTransientRetries?: 0 | 1;
  fetchImpl?: FetchLike;
  now?: () => Date;
}>;

type AnalyzeRequest = Readonly<{
  packet: EvidencePacket;
  correlationId: string;
}>;

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

type TaskDefinition<T> = Readonly<{
  prompt: string;
  promptVersion: string;
  schema: object;
  parse: (value: unknown) => T;
  evidenceReferences: (output: T) => string[];
}>;

function elapsedSince(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export class GeminiAdapter {
  private readonly timeoutMs: number;
  private readonly maxTransientRetries: 0 | 1;
  private readonly fetchImpl: FetchLike;
  private readonly now: () => Date;

  constructor(private readonly config: GeminiAdapterConfig) {
    this.timeoutMs = config.timeoutMs ?? 15_000;
    this.maxTransientRetries = config.maxTransientRetries ?? 1;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.now = config.now ?? (() => new Date());
  }

  health(): IntegrationHealth {
    return this.config.apiKey && this.config.model ? "AVAILABLE" : "UNAVAILABLE";
  }

  analyzeRootCause(
    request: AnalyzeRequest,
  ): Promise<IntegrationResult<ValidatedAiResult<RootCauseOutput>>> {
    return this.execute(request, {
      prompt: renderRootCausePrompt(request.packet),
      promptVersion: ROOT_CAUSE_PROMPT_VERSION,
      schema: rootCauseJsonSchema,
      parse: (value) => parseRootCauseOutput(value, request.packet),
      evidenceReferences: (output) => output.evidenceIds,
    });
  }

  recommendRemediation(
    request: AnalyzeRequest,
  ): Promise<IntegrationResult<ValidatedAiResult<RemediationOutput>>> {
    return this.execute(request, {
      prompt: renderRemediationPrompt(request.packet),
      promptVersion: REMEDIATION_PROMPT_VERSION,
      schema: remediationJsonSchema,
      parse: (value) => parseRemediationOutput(value, request.packet),
      evidenceReferences: (output) => output.evidenceIds,
    });
  }

  private async execute<T>(
    request: AnalyzeRequest,
    task: TaskDefinition<T>,
  ): Promise<IntegrationResult<ValidatedAiResult<T>>> {
    const startedAt = Date.now();
    if (!this.config.apiKey || !this.config.model) {
      return {
        ok: false,
        errorCode: "AI_UNAVAILABLE",
        retryable: false,
        provider: PROVIDER,
        durationMs: elapsedSince(startedAt),
      };
    }

    const requestTimestamp = this.now().toISOString();
    const attempts = this.maxTransientRetries + 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.config.model)}:generateContent`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-goog-api-key": this.config.apiKey,
              "x-servicegraph-correlation-id": request.correlationId,
            },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: task.prompt }] }],
              generationConfig: {
                responseFormat: {
                  text: { mimeType: "application/json", schema: task.schema },
                },
              },
            }),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          const retryable = isTransientStatus(response.status);
          if (retryable && attempt + 1 < attempts) continue;
          return {
            ok: false,
            errorCode: retryable ? "AI_PROVIDER_TRANSIENT_ERROR" : "AI_PROVIDER_ERROR",
            retryable,
            provider: PROVIDER,
            durationMs: elapsedSince(startedAt),
          };
        }

        const providerResponse = (await response.json()) as GeminiResponse;
        const text = providerResponse.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          return {
            ok: false,
            errorCode: "AI_EMPTY_RESPONSE",
            retryable: false,
            provider: PROVIDER,
            durationMs: elapsedSince(startedAt),
          };
        }

        let raw: unknown;
        try {
          raw = JSON.parse(text);
        } catch {
          return {
            ok: false,
            errorCode: "AI_INVALID_OUTPUT",
            retryable: false,
            provider: PROVIDER,
            durationMs: elapsedSince(startedAt),
          };
        }

        try {
          const output = task.parse(raw);
          return {
            ok: true,
            data: {
              output,
              provenance: {
                provider: PROVIDER,
                modelName: this.config.model,
                promptVersion: task.promptVersion,
                requestTimestamp,
                responseTimestamp: this.now().toISOString(),
                validationOutcome: "VALID",
                evidenceReferences: task.evidenceReferences(output),
                correlationId: request.correlationId,
              },
            },
            provider: PROVIDER,
            durationMs: elapsedSince(startedAt),
          };
        } catch {
          return {
            ok: false,
            errorCode: "AI_INVALID_OUTPUT",
            retryable: false,
            provider: PROVIDER,
            durationMs: elapsedSince(startedAt),
          };
        }
      } catch (error) {
        const retryable =
          error instanceof Error &&
          (error.name === "AbortError" || error instanceof TypeError);
        if (retryable && attempt + 1 < attempts) continue;
        return {
          ok: false,
          errorCode:
            error instanceof Error && error.name === "AbortError"
              ? "AI_TIMEOUT"
              : "AI_UNAVAILABLE",
          retryable,
          provider: PROVIDER,
          durationMs: elapsedSince(startedAt),
        };
      } finally {
        clearTimeout(timeout);
      }
    }

    return {
      ok: false,
      errorCode: "AI_UNAVAILABLE",
      retryable: true,
      provider: PROVIDER,
      durationMs: elapsedSince(startedAt),
    };
  }
}
