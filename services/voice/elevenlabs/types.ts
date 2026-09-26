export type IntegrationResult<T> =
  | { ok: true; data: T; provider: string; durationMs: number }
  | { ok: false; errorCode: string; retryable: boolean; provider: string; durationMs: number };

export type IntegrationState = "AVAILABLE" | "DEGRADED" | "UNAVAILABLE";

export interface IntegrationHealth {
  readonly provider: "ELEVENLABS";
  readonly state: IntegrationState;
  readonly checkedAt: string;
  readonly reasonCode: string | null;
}

export interface VoiceAudio {
  readonly data: Blob;
  readonly fileName: string;
  readonly contentType: string;
}

export interface AudioValidationPolicy {
  readonly maxBytes: number;
  readonly acceptedContentTypes: ReadonlySet<string>;
}

export interface TranscriptionInput {
  readonly audio: VoiceAudio;
  readonly language?: "en" | "fr";
}

export interface Transcription {
  readonly text: string;
  readonly sourceLanguage: string | null;
  readonly provenance: {
    readonly provider: "ELEVENLABS";
    readonly model: "scribe_v2";
  };
}

export interface ApprovedCommunication {
  readonly communicationId: string;
  readonly text: string;
  readonly language: "en" | "fr";
  readonly state: "READY" | "SENT";
}

export interface SpeechAudio {
  readonly bytes: Uint8Array;
  readonly contentType: "audio/mpeg";
  readonly provenance: {
    readonly provider: "ELEVENLABS";
    readonly model: "eleven_multilingual_v2";
    readonly voiceId: string;
  };
}

export interface ElevenLabsTransport {
  transcribe(input: {
    readonly file: Blob;
    readonly modelId: "scribe_v2";
    readonly languageCode?: "eng" | "fra";
  }): Promise<{ readonly text?: unknown; readonly languageCode?: unknown }>;
  speak(input: {
    readonly voiceId: string;
    readonly text: string;
    readonly modelId: "eleven_multilingual_v2";
  }): Promise<Uint8Array>;
}

export interface ElevenLabsConfig {
  readonly apiKey: string;
  readonly voiceId: string;
  readonly sttModel: "scribe_v2";
  readonly ttsModel: "eleven_multilingual_v2";
  readonly timeoutMs: number;
  readonly maxRetries: 0 | 1;
}
