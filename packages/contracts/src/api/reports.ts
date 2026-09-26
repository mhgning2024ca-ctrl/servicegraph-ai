import { z } from "zod";

import { CustomerReportSchema, ReportChannelSchema } from "../domain/report.js";
import { NullableUuidSchema, UtcTimestampSchema, UuidSchema } from "../domain/common.js";

export const CreateReportRequestSchema = z.object({
  clientReportId: UuidSchema,
  channel: ReportChannelSchema,
  text: z.string(),
  serviceId: NullableUuidSchema,
  areaCode: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  sourceLanguage: z.string(),
});
export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>;

export const CreateReportResponseSchema = z.object({
  report: CustomerReportSchema,
  receipt: z.object({
    reportId: UuidSchema,
    receivedAt: UtcTimestampSchema,
  }),
});
export type CreateReportResponse = z.infer<typeof CreateReportResponseSchema>;

export const AffectedConfirmationRequestSchema = z.object({
  serviceId: NullableUuidSchema,
  areaCode: z.string(),
});
export type AffectedConfirmationRequest = z.infer<
  typeof AffectedConfirmationRequestSchema
>;
