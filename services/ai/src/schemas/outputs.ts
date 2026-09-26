import { z } from "zod";
import type { EvidencePacket } from "./evidence-packet.js";
import { packetEvidenceIds } from "./evidence-packet.js";

const hypothesisAlternativeSchema = z
  .object({
    label: z.string().min(1),
    targetNodeId: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const rootCauseOutputSchema = z
  .object({
    label: z.string().min(1),
    targetNodeId: z.string().nullable(),
    confidence: z.number().min(0).max(1),
    rationale: z.string().min(1),
    evidenceIds: z.array(z.string()),
    assumptions: z.array(z.string()),
    alternativeHypotheses: z.array(hypothesisAlternativeSchema),
  })
  .strict();

export const remediationOutputSchema = z
  .object({
    actionType: z.enum([
      "REROUTE_TRAFFIC",
      "RESTART_SIMULATED_NODE",
      "THROTTLE_LOAD",
      "NO_ACTION",
    ]),
    targetNodeId: z.string().nullable(),
    parameters: z.record(z.union([z.string(), z.number(), z.boolean()])),
    rationale: z.string().min(1),
    expectedEffect: z.string().min(1),
    risk: z.enum(["LOW", "MEDIUM", "HIGH"]),
    evidenceIds: z.array(z.string()),
    assumptions: z.array(z.string()),
  })
  .strict();

export type RootCauseOutput = z.infer<typeof rootCauseOutputSchema>;
export type RemediationOutput = z.infer<typeof remediationOutputSchema>;

function validateReferences(
  packet: EvidencePacket,
  targetNodeId: string | null,
  evidenceIds: string[],
): void {
  const nodeIds = new Set(packet.candidateNodes.map(({ id }) => id));
  if (targetNodeId !== null && !nodeIds.has(targetNodeId)) {
    throw new Error("AI_TARGET_NODE_NOT_IN_PACKET");
  }

  const allowedEvidenceIds = packetEvidenceIds(packet);
  if (evidenceIds.some((id) => !allowedEvidenceIds.has(id))) {
    throw new Error("AI_EVIDENCE_NOT_IN_PACKET");
  }
}

export function parseRootCauseOutput(
  value: unknown,
  packet: EvidencePacket,
): RootCauseOutput {
  const parsed = rootCauseOutputSchema.parse(value);
  validateReferences(packet, parsed.targetNodeId, parsed.evidenceIds);
  for (const alternative of parsed.alternativeHypotheses) {
    validateReferences(packet, alternative.targetNodeId, []);
  }
  return parsed;
}

export function parseRemediationOutput(
  value: unknown,
  packet: EvidencePacket,
): RemediationOutput {
  const parsed = remediationOutputSchema.parse(value);
  validateReferences(packet, parsed.targetNodeId, parsed.evidenceIds);
  return parsed;
}
