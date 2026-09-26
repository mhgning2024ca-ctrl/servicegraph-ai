import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { ElevenLabsHealthTracker } from "./health.js";
import type { ElevenLabsConfig, ElevenLabsTransport, IntegrationResult } from "./types.js";

export interface ElevenLabsEnvironment {
  readonly ELEVENLABS_API_KEY?: string;
  readonly ELEVENLABS_VOICE_ID?: string;
  readonly ELEVENLABS_STT_MODEL?: string;
  readonly ELEVENLABS_TTS_MODEL?: string;
}

export function loadElevenLabsConfig(env: ElevenLabsEnvironment): ElevenLabsConfig | null {
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  const voiceId = env.ELEVENLABS_VOICE_ID?.trim();
  if (!apiKey || !voiceId) return null;
  if ((env.ELEVENLABS_STT_MODEL ?? "scribe_v2") !== "scribe_v2") return null;
  if ((env.ELEVENLABS_TTS_MODEL ?? "eleven_multilingual_v2") !== "eleven_multilingual_v2") return null;
  return {
    apiKey,
    voiceId,
    sttModel: "scribe_v2",
    ttsModel: "eleven_multilingual_v2",
    timeoutMs: 15_000,
    maxRetries: 1,
  };
}

async function collectAudio(source: unknown): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  if (source instanceof Blob) return new Uint8Array(await source.arrayBuffer());
  if (source && typeof source === "object" && Symbol.asyncIterator in source) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of source as AsyncIterable<Uint8Array>) chunks.push(chunk);
    const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
    const output = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return output;
  }
  throw new Error("INVALID_PROVIDER_AUDIO");
}

export function createOfficialElevenLabsTransport(config: ElevenLabsConfig): ElevenLabsTransport {
  const client = new ElevenLabsClient({
    apiKey: config.apiKey,
    maxRetries: 0,
    timeoutInSeconds: Math.ceil(config.timeoutMs / 1_000),
  });
  return {
    async transcribe(input) {
      return client.speechToText.convert({
        file: input.file,
        modelId: input.modelId,
        ...(input.languageCode ? { languageCode: input.languageCode } : {}),
      });
    },
    async speak(input) {
      const audio = await client.textToSpeech.convert(input.voiceId, {
        text: input.text,
        modelId: input.modelId,
        outputFormat: "mp3_44100_128",
      });
      return collectAudio(audio);
    },
  };
}

type Attempt<T> = () => Promise<T>;

function safeFailure(error: unknown): { errorCode: string; retryable: boolean } {
  if (error instanceof Error && error.message === "ELEVENLABS_TIMEOUT") {
    return { errorCode: "ELEVENLABS_TIMEOUT", retryable: true };
  }
  const status =
    typeof error === "object" && error !== null && "statusCode" in error
      ? Number((error as { statusCode: unknown }).statusCode)
      : undefined;
  if (status === 429) return { errorCode: "ELEVENLABS_RATE_LIMITED", retryable: true };
  if (status && status >= 500) return { errorCode: "ELEVENLABS_UPSTREAM_UNAVAILABLE", retryable: true };
  if (status === 401 || status === 403) return { errorCode: "ELEVENLABS_AUTH_FAILED", retryable: false };
  return { errorCode: "ELEVENLABS_REQUEST_FAILED", retryable: false };
}

async function withTimeout<T>(attempt: Attempt<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      attempt(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("ELEVENLABS_TIMEOUT")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function executeElevenLabsRequest<T>(
  operation: Attempt<T>,
  config: Pick<ElevenLabsConfig, "timeoutMs" | "maxRetries">,
  health: ElevenLabsHealthTracker,
): Promise<IntegrationResult<T>> {
  const started = Date.now();
  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    try {
      const data = await withTimeout(operation, config.timeoutMs);
      health.available();
      return { ok: true, data, provider: "ELEVENLABS", durationMs: Date.now() - started };
    } catch (error) {
      const failure = safeFailure(error);
      if (!failure.retryable || attempt === config.maxRetries) {
        health.degraded(failure.errorCode);
        return { ok: false, ...failure, provider: "ELEVENLABS", durationMs: Date.now() - started };
      }
    }
  }
  health.degraded("ELEVENLABS_REQUEST_FAILED");
  return {
    ok: false,
    errorCode: "ELEVENLABS_REQUEST_FAILED",
    retryable: false,
    provider: "ELEVENLABS",
    durationMs: Date.now() - started,
  };
}
