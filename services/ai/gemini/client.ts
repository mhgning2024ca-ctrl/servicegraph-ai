import { GoogleGenAI } from "@google/genai";
import {
  CLASSIFICATION_PROMPT_VERSION,
  renderClassificationPrompt,
} from "../prompts/classification.v1.js";
import {
  COMMUNICATION_PROMPT_VERSION,
  renderCommunicationPrompt,
} from "../prompts/communication.v1.js";
import {
  REMEDIATION_PROMPT_VERSION,
  renderRemediationPrompt,
} from "../prompts/remediation.v1.js";
import {
  ROOT_CAUSE_PROMPT_VERSION,
  renderRootCausePrompt,
} from "../prompts/root-cause.v1.js";
import type { IntegrationHealth, IntegrationResult } from "../src/integration-result.js";
import type { EvidencePacket } from "../src/schemas/evidence-packet.js";
import {
  parseClassificationOutput,
  parseCommunicationOutput,
  parseRemediationOutput,
  parseRootCauseOutput,
  type ClassificationOutput,
  type CommunicationOutput,
  type RemediationOutput,
  type RootCauseOutput,
} from "../src/schemas/outputs.js";
import {
  classificationJsonSchema,
  communicationJsonSchema,
  remediationJsonSchema,
  rootCauseJsonSchema,
} from "../src/gemini/json-schemas.js";

const PROVIDER = "GEMINI";
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

type GeminiGenerateParameters = Readonly<{
  model: string;
  contents: string;
  config: Readonly<{
    responseMimeType: "application/json";
    responseJsonSchema: object;
    abortSignal: AbortSignal;
    httpOptions: Readonly<{
      timeout: number;
      retryOptions: Readonly<{ attempts: 1 }>;
      headers: Readonly<Record<string, string>>;
    }>;
  }>;
}>;

export interface GeminiSdk {
  models: {
    generateContent(parameters: GeminiGenerateParameters): Promise<{ text?: string }>;
  };
}

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

export type GeminiClientConfig = Readonly<{
  apiKey: string | undefined;
  model?: string | undefined;
  timeoutMs?: number;
  maxTransientRetries?: 0 | 1;
  sdk?: GeminiSdk;
  now?: () => Date;
}>;

export type AnalyzeRequest = Readonly<{
  packet: EvidencePacket;
  correlationId: string;
}>;

export type ClassifyReportRequest = Readonly<{
  text: string;
  sourceLanguage: string | null;
  correlationId: string;
}>;

export type DraftCommunicationRequest = Readonly<{
  packet: EvidencePacket;
  language: "en" | "fr";
  correlationId: string;
}>;

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

function providerStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const status = "status" in error ? error.status : "code" in error ? error.code : undefined;
  return typeof status === "number" ? status : undefined;
}

function isTransient(error: unknown): boolean {
  const status = providerStatus(error);
  return (
    (status !== undefined && (status === 408 || status === 429 || status >= 500)) ||
    (error instanceof Error && (error.name === "AbortError" || error instanceof TypeError))
  );
}

export class GeminiClient {
  private readonly timeoutMs: number;
  private readonly maxTransientRetries: 0 | 1;
  private readonly now: () => Date;
  private readonly model: string;
  private readonly sdk: GeminiSdk | undefined;

  constructor(private readonly config: GeminiClientConfig) {
    this.timeoutMs = config.timeoutMs ?? 15_000;
    this.maxTransientRetries = config.maxTransientRetries ?? 1;
    this.now = config.now ?? (() => new Date());
    this.model = config.model?.trim() || DEFAULT_GEMINI_MODEL;
    this.sdk =
      config.sdk ??
      (config.apiKey
        ? (new GoogleGenAI({
            apiKey: config.apiKey,
            httpOptions: {
              timeout: this.timeoutMs,
              retryOptions: { attempts: 1 },
            },
          }) as GeminiSdk)
        : undefined);
  }

  health(): IntegrationHealth {
    return this.config.apiKey && this.sdk ? "AVAILABLE" : "UNAVAILABLE";
  }

  analyzeRootCause(request: AnalyzeRequest): Promise<IntegrationResult<ValidatedAiResult<RootCauseOutput>>> {
    return this.execute(request.correlationId, {
      prompt: renderRootCausePrompt(request.packet),
      promptVersion: ROOT_CAUSE_PROMPT_VERSION,
      schema: rootCauseJsonSchema,
      parse: (value) => parseRootCauseOutput(value, request.packet),
      evidenceReferences: (output) => output.evidenceIds,
    });
  }

  recommendRemediation(request: AnalyzeRequest): Promise<IntegrationResult<ValidatedAiResult<RemediationOutput>>> {
    return this.execute(request.correlationId, {
      prompt: renderRemediationPrompt(request.packet),
      promptVersion: REMEDIATION_PROMPT_VERSION,
      schema: remediationJsonSchema,
      parse: (value) => parseRemediationOutput(value, request.packet),
      evidenceReferences: (output) => output.evidenceIds,
    });
  }

  classifyReport(request: ClassifyReportRequest): Promise<IntegrationResult<ValidatedAiResult<ClassificationOutput>>> {
    return this.execute(request.correlationId, {
      prompt: renderClassificationPrompt(request.text, request.sourceLanguage),
      promptVersion: CLASSIFICATION_PROMPT_VERSION,
      schema: classificationJsonSchema,
      parse: parseClassificationOutput,
      evidenceReferences: () => [],
    });
  }

  draftCommunication(request: DraftCommunicationRequest): Promise<IntegrationResult<ValidatedAiResult<CommunicationOutput>>> {
    return this.execute(request.correlationId, {
      prompt: renderCommunicationPrompt(request.packet, request.language),
      promptVersion: COMMUNICATION_PROMPT_VERSION,
      schema: communicationJsonSchema,
      parse: (value) => parseCommunicationOutput(value, request.language, request.packet),
      evidenceReferences: (output) => output.evidenceIds,
    });
  }

  private async execute<T>(
    correlationId: string,
    task: TaskDefinition<T>,
  ): Promise<IntegrationResult<ValidatedAiResult<T>>> {
    const startedAt = Date.now();
    if (!this.config.apiKey || !this.sdk) {
      return { ok: false, errorCode: "AI_UNAVAILABLE", retryable: false, provider: PROVIDER, durationMs: elapsedSince(startedAt) };
    }

    const requestTimestamp = this.now().toISOString();
    const attempts = this.maxTransientRetries + 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.sdk.models.generateContent({
          model: this.model,
          contents: task.prompt,
          config: {
            responseMimeType: "application/json",
            responseJsonSchema: task.schema,
            abortSignal: controller.signal,
            httpOptions: {
              timeout: this.timeoutMs,
              retryOptions: { attempts: 1 },
              headers: { "x-servicegraph-correlation-id": correlationId },
            },
          },
        });
        if (!response.text) {
          return { ok: false, errorCode: "AI_EMPTY_RESPONSE", retryable: false, provider: PROVIDER, durationMs: elapsedSince(startedAt) };
        }

        let raw: unknown;
        try {
          raw = JSON.parse(response.text);
        } catch {
          return { ok: false, errorCode: "AI_INVALID_OUTPUT", retryable: false, provider: PROVIDER, durationMs: elapsedSince(startedAt) };
        }

        try {
          const output = task.parse(raw);
          return {
            ok: true,
            data: {
              output,
              provenance: {
                provider: PROVIDER,
                modelName: this.model,
                promptVersion: task.promptVersion,
                requestTimestamp,
                responseTimestamp: this.now().toISOString(),
                validationOutcome: "VALID",
                evidenceReferences: task.evidenceReferences(output),
                correlationId,
              },
            },
            provider: PROVIDER,
            durationMs: elapsedSince(startedAt),
          };
        } catch {
          return { ok: false, errorCode: "AI_INVALID_OUTPUT", retryable: false, provider: PROVIDER, durationMs: elapsedSince(startedAt) };
        }
      } catch (error) {
        const retryable = isTransient(error);
        if (retryable && attempt + 1 < attempts) continue;
        const timedOut = error instanceof Error && error.name === "AbortError";
        return {
          ok: false,
          errorCode: timedOut ? "AI_TIMEOUT" : retryable ? "AI_PROVIDER_TRANSIENT_ERROR" : "AI_PROVIDER_ERROR",
          retryable,
          provider: PROVIDER,
          durationMs: elapsedSince(startedAt),
        };
      } finally {
        clearTimeout(timeout);
      }
    }

    return { ok: false, errorCode: "AI_UNAVAILABLE", retryable: true, provider: PROVIDER, durationMs: elapsedSince(startedAt) };
  }
}

export function createGeminiClientFromEnv(
  environment: NodeJS.ProcessEnv = process.env,
): GeminiClient {
  return new GeminiClient({
    apiKey: environment.GEMINI_API_KEY,
    model: environment.GEMINI_MODEL,
  });
}
