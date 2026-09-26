import { z } from "zod";

import { NullableUuidSchema, UtcTimestampSchema, UuidSchema } from "./common.js";

export const ReportChannelSchema = z.enum([
  "WEB_TEXT",
  "WEB_VOICE",
  "PUBLIC_API",
  "SIMULATOR",
]);
export type ReportChannel = z.infer<typeof ReportChannelSchema>;

export const ReportProcessingStateSchema = z.enum([
  "RECEIVED",
  "CLASSIFYING",
  "CLASSIFIED",
  "CORRELATED",
  "NEEDS_REVIEW",
  "FAILED",
]);
export type ReportProcessingState = z.infer<typeof ReportProcessingStateSchema>;

export const CustomerReportSchema = z.object({
  id: UuidSchema,
  clientReportId: UuidSchema,
  createdAt: UtcTimestampSchema,
  channel: ReportChannelSchema,
  state: ReportProcessingStateSchema,
  text: z.string(),
  transcript: z.string().nullable(),
  audioAssetId: z.string().nullable(),
  serviceId: NullableUuidSchema,
  areaCode: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  symptomCodes: z.array(z.string()),
  citizenId: z.string().nullable(),
  correlatedIncidentId: NullableUuidSchema,
  sourceLanguage: z.string().nullable(),
});
export type CustomerReport = z.infer<typeof CustomerReportSchema>;
