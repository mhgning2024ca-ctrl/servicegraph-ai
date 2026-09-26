import { executeElevenLabsRequest } from "./client.js";
import { ElevenLabsHealthTracker } from "./health.js";
import type {
  ApprovedCommunication,
  ElevenLabsConfig,
  ElevenLabsTransport,
  IntegrationResult,
  SpeechAudio,
} from "./types.js";

export function createTextToSpeechAdapter(
  transport: ElevenLabsTransport,
  config: ElevenLabsConfig,
  health: ElevenLabsHealthTracker,
) {
  return async (communication: ApprovedCommunication): Promise<IntegrationResult<SpeechAudio>> => {
    if (
      !communication.text.trim() ||
      !communication.communicationId.trim() ||
      (communication.state !== "READY" && communication.state !== "SENT")
    ) {
      return {
        ok: false,
        errorCode: "ELEVENLABS_UNAPPROVED_TEXT",
        retryable: false,
        provider: "ELEVENLABS",
        durationMs: 0,
      };
    }
    const result = await executeElevenLabsRequest(
      () =>
        transport.speak({
          voiceId: config.voiceId,
          text: communication.text,
          modelId: config.ttsModel,
        }),
      config,
      health,
    );
    if (!result.ok) return result;
    if (result.data.byteLength === 0) {
      health.degraded("ELEVENLABS_EMPTY_AUDIO");
      return {
        ok: false,
        errorCode: "ELEVENLABS_EMPTY_AUDIO",
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
        bytes: result.data,
        contentType: "audio/mpeg",
        provenance: {
          provider: "ELEVENLABS",
          model: "eleven_multilingual_v2",
          voiceId: config.voiceId,
        },
      },
    };
  };
}
