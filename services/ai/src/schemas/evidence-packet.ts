import { z } from "zod";
import {
  incidentStatusSchema,
  infrastructureNodeSchema,
  serviceSchema,
} from "./domain.js";

const reportEvidenceSchema = z
  .object({
    id: z.string().min(1),
    createdAt: z.string().datetime({ offset: true }),
    text: z.string(),
    symptomCodes: z.array(z.string()),
    areaCode: z.string().nullable(),
    serviceId: z.string().nullable(),
  })
  .strict();

const telemetryAnomalySchema = z
  .object({
    id: z.string().min(1),
    nodeId: z.string().min(1),
    metric: z.string().min(1),
    value: z.number().finite(),
    threshold: z.number().finite(),
    observedAt: z.string().datetime({ offset: true }),
  })
  .strict();

const topologyEvidenceSchema = z
  .object({
    serviceId: z.string().min(1),
    nodeId: z.string().min(1),
    relation: z.string().min(1),
  })
  .strict();

const historicalContextSchema = z
  .object({
    source: z.enum(["BACKBOARD", "POSTGRES_HISTORY"]),
    referenceId: z.string().min(1),
    summary: z.string(),
  })
  .strict();

export const evidencePacketSchema = z
  .object({
    incidentId: z.string().min(1),
    incidentStatus: incidentStatusSchema,
    services: z.array(serviceSchema),
    candidateNodes: z.array(infrastructureNodeSchema),
    reports: z.array(reportEvidenceSchema),
    telemetryAnomalies: z.array(telemetryAnomalySchema),
    topologyEvidence: z.array(topologyEvidenceSchema),
    historicalContext: z.array(historicalContextSchema),
  })
  .strict();

export type EvidencePacket = z.infer<typeof evidencePacketSchema>;

export type EvidencePacketLimits = Readonly<{
  services: number;
  candidateNodes: number;
  reports: number;
  telemetryAnomalies: number;
  topologyEvidence: number;
  historicalContext: number;
}>;

function assertLimit(name: keyof EvidencePacketLimits, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
}

/**
 * Creates a validated, caller-bounded packet. Limits are mandatory so that the
 * orchestration layer, rather than the model adapter, controls disclosed data.
 */
export function buildEvidencePacket(
  input: EvidencePacket,
  limits: EvidencePacketLimits,
): EvidencePacket {
  const parsed = evidencePacketSchema.parse(input);
  for (const [name, value] of Object.entries(limits) as Array<
    [keyof EvidencePacketLimits, number]
  >) {
    assertLimit(name, value);
  }

  return evidencePacketSchema.parse({
    ...parsed,
    services: parsed.services.slice(0, limits.services),
    candidateNodes: parsed.candidateNodes.slice(0, limits.candidateNodes),
    reports: parsed.reports.slice(0, limits.reports),
    telemetryAnomalies: parsed.telemetryAnomalies.slice(
      0,
      limits.telemetryAnomalies,
    ),
    topologyEvidence: parsed.topologyEvidence.slice(0, limits.topologyEvidence),
    historicalContext: parsed.historicalContext.slice(
      0,
      limits.historicalContext,
    ),
  });
}

export function packetEvidenceIds(packet: EvidencePacket): ReadonlySet<string> {
  return new Set([
    ...packet.reports.map(({ id }) => id),
    ...packet.telemetryAnomalies.map(({ id }) => id),
    ...packet.historicalContext.map(({ referenceId }) => referenceId),
  ]);
}
