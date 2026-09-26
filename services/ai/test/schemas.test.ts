import { describe, expect, it } from "vitest";
import { buildEvidencePacket } from "../src/schemas/evidence-packet.js";
import {
  parseRemediationOutput,
  parseRootCauseOutput,
} from "../src/schemas/outputs.js";
import { evidencePacketFixture } from "./fixtures.js";

describe("bounded evidence packets", () => {
  it("applies every caller-provided bound", () => {
    const packet = buildEvidencePacket(evidencePacketFixture, {
      services: 1,
      candidateNodes: 1,
      reports: 0,
      telemetryAnomalies: 0,
      topologyEvidence: 1,
      historicalContext: 0,
    });
    expect(packet.reports).toEqual([]);
    expect(packet.telemetryAnomalies).toEqual([]);
  });

  it("rejects invalid limits", () => {
    expect(() =>
      buildEvidencePacket(evidencePacketFixture, {
        services: -1,
        candidateNodes: 1,
        reports: 1,
        telemetryAnomalies: 1,
        topologyEvidence: 1,
        historicalContext: 1,
      }),
    ).toThrow(RangeError);
  });
});

describe("AI output validation", () => {
  it("accepts grounded root-cause output", () => {
    const output = parseRootCauseOutput(
      {
        label: "NODE-17 degradation",
        targetNodeId: "node-17-id",
        confidence: 0.91,
        rationale: "Packet loss and reports converge.",
        evidenceIds: ["report-1", "telemetry-1"],
        assumptions: [],
        alternativeHypotheses: [],
      },
      evidencePacketFixture,
    );
    expect(output.confidence).toBe(0.91);
  });

  it("rejects fabricated evidence and target nodes", () => {
    expect(() =>
      parseRootCauseOutput(
        {
          label: "Fabricated",
          targetNodeId: "node-99-id",
          confidence: 0.5,
          rationale: "Unsupported.",
          evidenceIds: ["fabricated-evidence"],
          assumptions: [],
          alternativeHypotheses: [],
        },
        evidencePacketFixture,
      ),
    ).toThrow();
  });

  it("rejects remediation outside canonical actions", () => {
    expect(() =>
      parseRemediationOutput(
        {
          actionType: "EXECUTE_SHELL",
          targetNodeId: "node-17-id",
          parameters: {},
          rationale: "Unsafe.",
          expectedEffect: "Unknown.",
          risk: "HIGH",
          evidenceIds: ["telemetry-1"],
          assumptions: [],
        },
        evidencePacketFixture,
      ),
    ).toThrow();
  });
});
