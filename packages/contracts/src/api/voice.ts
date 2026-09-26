import { z } from "zod";

export const VoiceTranscriptionResponseSchema = z.object({
  text: z.string().min(1),
  sourceLanguage: z.string().min(2).nullable(),
  provider: z.literal("ELEVENLABS"),
  model: z.string().min(1),
});

export type VoiceTranscriptionResponse = z.infer<typeof VoiceTranscriptionResponseSchema>;
