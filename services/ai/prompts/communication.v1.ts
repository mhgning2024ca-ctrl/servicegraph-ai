import type { EvidencePacket } from "../src/schemas/evidence-packet.js";

export const COMMUNICATION_PROMPT_VERSION = "communication.v1";

export function renderCommunicationPrompt(packet: EvidencePacket, language: "en" | "fr"): string {
  return [
    `Draft a concise ${language} public service update using only the supplied incident evidence.`,
    "Do not claim recovery unless the supplied incident status is RESOLVED.",
    "Do not invent telemetry, times, causes, or affected areas.",
    "Return only JSON matching the requested schema.",
    `Evidence packet: ${JSON.stringify(packet)}`,
  ].join("\n");
}
