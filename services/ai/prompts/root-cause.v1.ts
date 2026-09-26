import type { EvidencePacket } from "../src/schemas/evidence-packet.js";

export const ROOT_CAUSE_PROMPT_VERSION = "root-cause.v1";

export function renderRootCausePrompt(packet: EvidencePacket): string {
  return [
    "You are a telecom operations decision-support system.",
    "Rank probable root causes using only the supplied evidence packet.",
    "Never invent evidence identifiers, nodes, telemetry, or recovery claims.",
    "Return only JSON matching the requested schema.",
    `Evidence packet: ${JSON.stringify(packet)}`,
  ].join("\n");
}
