import { z } from "zod";

import { NullableUuidSchema, UtcTimestampSchema, UuidSchema } from "./common.js";

export const TelemetryMetricSchema = z.enum([
  "LATENCY_MS",
  "PACKET_LOSS_PCT",
  "ERROR_RATE",
  "THROUGHPUT_MBPS",
  "AVAILABILITY",
]);
export type TelemetryMetric = z.infer<typeof TelemetryMetricSchema>;

export const TelemetrySampleSchema = z.object({
  id: UuidSchema,
  nodeId: UuidSchema,
  observedAt: UtcTimestampSchema,
  metric: TelemetryMetricSchema,
  value: z.number(),
  unit: z.string(),
  source: z.enum(["SIMULATOR", "EXTERNAL"]),
  scenarioId: NullableUuidSchema,
});
export type TelemetrySample = z.infer<typeof TelemetrySampleSchema>;

export const TelemetryBatchSchema = z.array(TelemetrySampleSchema).max(500);
export type TelemetryBatch = z.infer<typeof TelemetryBatchSchema>;
