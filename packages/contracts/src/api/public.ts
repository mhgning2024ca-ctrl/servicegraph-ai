import { z } from "zod";

import { IncidentStatusSchema, SeveritySchema, UtcTimestampSchema, UuidSchema } from "../domain/common.js";

export const PublicConfigResponseSchema = z.object({
  auth: z.object({
    mode: z.enum(["mock", "auth0"]),
    domain: z.string().nullable(),
    clientId: z.string().nullable(),
    audience: z.string().nullable(),
  }),
  features: z.object({
    gemini: z.boolean(),
    tigerData: z.boolean(),
    elevenLabs: z.boolean(),
    backboard: z.boolean(),
    simulator: z.boolean(),
  }),
});
export type PublicConfigResponse = z.infer<typeof PublicConfigResponseSchema>;

export const PublicIncidentSchema = z.object({
  id: UuidSchema,
  incidentNumber: z.string(),
  title: z.string(),
  status: IncidentStatusSchema,
  severity: SeveritySchema,
  affectedUsersEstimate: z.number().int().nonnegative(),
  affectedAreaCodes: z.array(z.string()),
  updatedAt: UtcTimestampSchema,
  resolvedAt: UtcTimestampSchema.nullable(),
});
export type PublicIncident = z.infer<typeof PublicIncidentSchema>;

export const PublicIncidentListResponseSchema = z.object({
  incidents: z.array(PublicIncidentSchema),
});
export type PublicIncidentListResponse = z.infer<typeof PublicIncidentListResponseSchema>;

export const AffectedConfirmationResponseSchema = z.object({
  accepted: z.literal(true),
  incidentId: UuidSchema,
  evidenceId: UuidSchema,
});
export type AffectedConfirmationResponse = z.infer<typeof AffectedConfirmationResponseSchema>;

export const VoiceTranscriptionResponseSchema = z.object({
  text: z.string().min(1),
  sourceLanguage: z.string().nullable(),
  provider: z.enum(["ELEVENLABS", "MOCK"]),
  model: z.string(),
});
export type VoiceTranscriptionResponse = z.infer<typeof VoiceTranscriptionResponseSchema>;
