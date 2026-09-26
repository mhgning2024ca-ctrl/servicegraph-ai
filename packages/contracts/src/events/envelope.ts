import { z } from "zod";

import { JsonObjectSchema, UtcTimestampSchema, UuidSchema } from "../domain/common.js";

export const OperationalEventTypeSchema = z.enum([
  "report.created",
  "report.correlated",
  "telemetry.anomaly",
  "incident.created",
  "incident.updated",
  "hypothesis.created",
  "remediation.proposed",
  "remediation.approved",
  "remediation.executing",
  "verification.updated",
  "incident.resolved",
  "communication.created",
  "integration.degraded",
]);
export type OperationalEventType = z.infer<typeof OperationalEventTypeSchema>;

export const OperationalEventEnvelopeSchema = z.object({
  id: z.string(),
  type: OperationalEventTypeSchema,
  occurredAt: UtcTimestampSchema,
  correlationId: UuidSchema,
  entityId: UuidSchema.nullable(),
  payload: JsonObjectSchema,
});
export type OperationalEventEnvelope = z.infer<
  typeof OperationalEventEnvelopeSchema
>;
