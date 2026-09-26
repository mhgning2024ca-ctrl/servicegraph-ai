import type { FastifyInstance } from "fastify";

import { VoiceTranscriptionResponseSchema } from "@servicegraph/contracts";

import { ApiError } from "../../shared/api-error.js";

const acceptedAudioTypes = new Set([
  "audio/webm",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
]);

export function registerVoiceRoutes(
  app: FastifyInstance,
  env: NodeJS.ProcessEnv = process.env,
): void {
  for (const contentType of acceptedAudioTypes) {
    app.addContentTypeParser(contentType, { parseAs: "buffer", bodyLimit: 1_048_576 }, (_request, body, done) => {
      done(null, body);
    });
  }

  app.post("/v1/voice/transcriptions", async (request, reply) => {
    const apiKey = env.ELEVENLABS_API_KEY?.trim();
    if (!apiKey) {
      throw new ApiError({
        code: "ELEVENLABS_UNAVAILABLE",
        statusCode: 503,
        message: "Voice transcription is temporarily unavailable. Please type your report.",
      });
    }

    const contentType = request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase();
    if (!contentType || !acceptedAudioTypes.has(contentType)) {
      throw new ApiError({
        code: "VALIDATION_ERROR",
        statusCode: 415,
        message: "Unsupported audio format.",
      });
    }
    if (!Buffer.isBuffer(request.body) || request.body.byteLength === 0) {
      throw new ApiError({
        code: "VALIDATION_ERROR",
        statusCode: 400,
        message: "Audio body is required.",
      });
    }

    const query = request.query as { language?: unknown };
    const language = query.language === "fr" ? "fr" : query.language === "en" ? "en" : undefined;
    const form = new FormData();
    const bytes = new Uint8Array(request.body);
    form.append("file", new Blob([bytes], { type: contentType }), `servicegraph-report.${extensionFor(contentType)}`);
    form.append("model_id", env.ELEVENLABS_STT_MODEL?.trim() || "scribe_v2");
    if (language) form.append("language_code", language === "fr" ? "fra" : "eng");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        body: form,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new ApiError({
          code: "ELEVENLABS_PROVIDER_ERROR",
          statusCode: response.status === 429 ? 503 : 502,
          message: "Voice transcription provider is unavailable. Please type your report.",
        });
      }
      const data = await response.json() as { text?: unknown; language_code?: unknown };
      if (typeof data.text !== "string" || !data.text.trim()) {
        throw new ApiError({
          code: "ELEVENLABS_INVALID_TRANSCRIPT",
          statusCode: 502,
          message: "Voice transcription returned no usable text.",
        });
      }
      return reply.send(VoiceTranscriptionResponseSchema.parse({
        text: data.text.trim(),
        sourceLanguage: typeof data.language_code === "string" ? data.language_code : language ?? null,
        provider: "ELEVENLABS",
        model: env.ELEVENLABS_STT_MODEL?.trim() || "scribe_v2",
      }));
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError({
        code: "ELEVENLABS_DEGRADED",
        statusCode: 503,
        message: "Voice transcription is temporarily unavailable. Please type your report.",
      });
    } finally {
      clearTimeout(timeout);
    }
  });
}

function extensionFor(contentType: string): string {
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("mpeg")) return "mp3";
  if (contentType.includes("mp4")) return "m4a";
  if (contentType.includes("ogg")) return "ogg";
  return "webm";
}
