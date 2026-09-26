import type { ElevenLabsTransport } from "./types.js";

export interface DeterministicVoiceMockOptions {
  readonly transcript?: string;
  readonly languageCode?: string;
  readonly audio?: Uint8Array;
  readonly failure?: Error;
}

export function createDeterministicElevenLabsTransport(
  options: DeterministicVoiceMockOptions = {},
): ElevenLabsTransport {
  return {
    async transcribe() {
      if (options.failure) throw options.failure;
      return {
        text: options.transcript ?? "My internet connection is intermittent.",
        languageCode: options.languageCode ?? "eng",
      };
    },
    async speak() {
      if (options.failure) throw options.failure;
      return options.audio ?? new Uint8Array([73, 68, 51]);
    },
  };
}
