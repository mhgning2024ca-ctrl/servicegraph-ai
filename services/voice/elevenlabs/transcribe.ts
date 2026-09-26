import { executeElevenLabsRequest } from "./client.js";
import { ElevenLabsHealthTracker } from "./health.js";
import type {
  AudioValidationPolicy,
  ElevenLabsConfig,
  ElevenLabsTransport,
  IntegrationResult,
  Transcription,
  TranscriptionInput,
} from "./types.js";

const languageCode = { en: "eng", fr: "fra" } as const;

export function createTranscriptionAdapter(
  transport: ElevenLabsTransport,
  config: ElevenLabsConfig,
  health: ElevenLabsHealthTracker,
  validation: AudioValidationPolicy,
) {
  return async (input: TranscriptionInput): Promise<IntegrationResult<Transcription>> => {
    if (
      input.audio.data.size === 0 ||
      input.audio.data.size > validation.maxBytes ||
      !validation.acceptedContentTypes.has(input.audio.contentType)
    ) {
      return {
        ok: false,
        errorCode: "ELEVENLABS_INVALID_AUDIO",
        retryable: false,
        provider: "ELEVENLABS",
        durationMs: 0,
      };
    }
    const result = await executeElevenLabsRequest(
      () =>
        transport.transcribe({
          file: input.audio.data,
          modelId: config.sttModel,
          ...(input.language ? { languageCode: languageCode[input.language] } : {}),
        }),
      config,
      health,
    );
    if (!result.ok) return result;
    if (typeof result.data.text !== "string" || result.data.text.trim().length === 0) {
      health.degraded("ELEVENLABS_INVALID_TRANSCRIPT");
      return {
        ok: false,
        errorCode: "ELEVENLABS_INVALID_TRANSCRIPT",
        retryable: false,
        provider: "ELEVENLABS",
        durationMs: result.durationMs,
      };
    }
    return {
      ok: true,
      provider: "ELEVENLABS",
      durationMs: result.durationMs,
      data: {
        text: result.data.text,
        sourceLanguage:
          typeof result.data.languageCode === "string" ? result.data.languageCode : input.language ?? null,
        provenance: { provider: "ELEVENLABS", model: "scribe_v2" },
      },
    };
  };
}
