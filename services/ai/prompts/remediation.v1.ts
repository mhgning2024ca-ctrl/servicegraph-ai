import type { EvidencePacket } from "../src/schemas/evidence-packet.js";

export const REMEDIATION_PROMPT_VERSION = "remediation.v1";

export function renderRemediationPrompt(packet: EvidencePacket): string {
  return [
    "You are a telecom operations decision-support system.",
    "Recommend a simulator remediation using only the supplied evidence packet.",
    "This is a recommendation, never an approval or execution instruction.",
    "Never invent evidence identifiers, nodes, telemetry, or recovery claims.",
    "Return only JSON matching the requested schema.",
    `Evidence packet: ${JSON.stringify(packet)}`,
  ].join("\n");
}
