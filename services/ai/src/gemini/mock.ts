import type { IntegrationResult } from "../integration-result.js";
import type { EvidencePacket } from "../schemas/evidence-packet.js";
import type { RootCauseOutput } from "../schemas/outputs.js";

export function deterministicRootCauseMock(
  packet: EvidencePacket,
): IntegrationResult<RootCauseOutput> {
  const targetNodeId = packet.candidateNodes.find(({ code }) => code === "NODE-17")?.id ?? null;
  const evidenceIds = [
    ...packet.reports.map(({ id }) => id),
    ...packet.telemetryAnomalies
      .filter(({ nodeId }) => nodeId === targetNodeId)
      .map(({ id }) => id),
  ];

  return {
    ok: true,
    provider: "GEMINI_MOCK",
    durationMs: 0,
    data: {
      label: targetNodeId ? "NODE-17 degradation" : "Insufficient evidence",
      targetNodeId,
      confidence: targetNodeId ? 0.91 : 0,
      rationale: targetNodeId
        ? "Reports and telemetry anomalies converge on the configured scenario node."
        : "The bounded packet contains no configured scenario node.",
      evidenceIds,
      assumptions: [],
      alternativeHypotheses: [],
    },
  };
}
