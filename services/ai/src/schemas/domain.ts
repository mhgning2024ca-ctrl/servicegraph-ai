import { z } from "zod";

export const incidentStatusSchema = z.enum([
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

export const serviceSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable(),
    publicVisible: z.boolean(),
    status: z.enum(["HEALTHY", "DEGRADED", "CRITICAL", "UNKNOWN"]),
  })
  .strict();

export const infrastructureNodeSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(["ROUTER", "SWITCH", "EDGE", "ACCESS", "SERVICE"]),
    status: z.enum(["HEALTHY", "DEGRADED", "CRITICAL", "UNKNOWN"]),
    latitude: z.number().finite().nullable(),
    longitude: z.number().finite().nullable(),
    areaCode: z.string().nullable(),
    metadata: z.record(z.union([z.string(), z.number(), z.boolean()])),
  })
  .strict();
