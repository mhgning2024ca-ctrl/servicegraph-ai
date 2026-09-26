import { z } from "zod";

export const UuidSchema = z.string().uuid();
export const UtcTimestampSchema = z.string().datetime({ offset: true });
export const ConfidenceSchema = z.number().min(0).max(1);
export const NullableUuidSchema = UuidSchema.nullable();
export const JsonPrimitiveSchema = z.union([z.string(), z.number(), z.boolean()]);
export const ScalarMetadataSchema = z.record(z.string(), JsonPrimitiveSchema);
export const JsonObjectSchema = z.record(z.string(), z.unknown());

export const IncidentStatusSchema = z.enum([
  "DETECTED",
  "INVESTIGATING",
  "CONFIRMED",
  "REMEDIATION_PROPOSED",
  "AWAITING_APPROVAL",
  "REJECTED",
  "REMEDIATING",
  "VERIFYING",
  "RESOLVED",
  "CLOSED",
]);
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;

export const SeveritySchema = z.enum(["INFO", "MINOR", "MAJOR", "CRITICAL"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const InfrastructureNodeStatusSchema = z.enum([
  "HEALTHY",
  "DEGRADED",
  "CRITICAL",
  "UNKNOWN",
]);
export type InfrastructureNodeStatus = z.infer<typeof InfrastructureNodeStatusSchema>;

export const IntegrationStateSchema = z.enum([
  "AVAILABLE",
  "DEGRADED",
  "UNAVAILABLE",
]);
export type IntegrationState = z.infer<typeof IntegrationStateSchema>;

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.unknown()),
    correlationId: UuidSchema,
  }),
});
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;
