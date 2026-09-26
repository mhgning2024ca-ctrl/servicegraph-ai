import type { EvidencePacket } from "../src/schemas/evidence-packet.js";

export const evidencePacketFixture: EvidencePacket = {
  incidentId: "incident-2048",
  incidentStatus: "INVESTIGATING",
  services: [
    {
      id: "service-internet",
      code: "INTERNET",
      name: "Internet",
      description: null,
      publicVisible: true,
      status: "DEGRADED",
    },
  ],
  candidateNodes: [
    {
      id: "node-17-id",
      code: "NODE-17",
      name: "Ottawa Node 17",
      type: "ROUTER",
      status: "DEGRADED",
      latitude: null,
      longitude: null,
      areaCode: "OTT-CENTRETOWN",
      metadata: { simulated: true },
    },
  ],
  reports: [
    {
      id: "report-1",
      createdAt: "2026-09-26T06:00:00Z",
      text: "Internet is intermittent.",
      symptomCodes: ["INTERMITTENT_CONNECTIVITY"],
      areaCode: "OTT-CENTRETOWN",
      serviceId: "service-internet",
    },
  ],
  telemetryAnomalies: [
    {
      id: "telemetry-1",
      nodeId: "node-17-id",
      metric: "PACKET_LOSS_PCT",
      value: 18,
      threshold: 5,
      observedAt: "2026-09-26T06:00:05Z",
    },
  ],
  topologyEvidence: [
    {
      serviceId: "service-internet",
      nodeId: "node-17-id",
      relation: "SERVICE_DEPENDS_ON_NODE",
    },
  ],
  historicalContext: [],
};
