import assert from "node:assert/strict";
import test from "node:test";
import {
  blastRadiusQuery,
  correlationCandidatesQuery,
  evaluateVerification,
  telemetryWindowQuery,
  verificationMetricsQuery,
} from "./queries.js";

const nodeId = "17171717-1717-4717-8717-171717171717";

test("query builders keep values parameterized", () => {
  const telemetry = telemetryWindowQuery({
    nodeId,
    windowStart: "2026-09-26T12:00:00Z",
    windowEnd: "2026-09-26T12:16:00Z",
    metrics: ["LATENCY_MS"],
  });
  const correlation = correlationCandidatesQuery({
    nodeId,
    referenceAt: "2026-09-26T12:08:00Z",
    windowMinutes: 10,
    serviceId: null,
    areaCode: "OTT-CENTRETOWN",
    symptomCodes: ["INTERMITTENT_CONNECTIVITY"],
    latencyThreshold: 100,
    packetLossThreshold: 5,
  });
  const blastRadius = blastRadiusQuery({
    rootNodeId: nodeId,
    reportWindowStart: "2026-09-26T12:00:00Z",
    reportWindowEnd: "2026-09-26T12:16:00Z",
  });
  const verification = verificationMetricsQuery({
    nodeId,
    executionStartedAt: "2026-09-26T12:12:00Z",
    beforeWindowStart: "2026-09-26T12:08:00Z",
    afterWindowEnd: "2026-09-26T12:16:00Z",
    metrics: ["LATENCY_MS", "PACKET_LOSS_PCT"],
  });

  for (const query of [telemetry, correlation, blastRadius, verification]) {
    assert.match(query.text, /\$1/);
    assert.ok(query.values.length > 0);
    assert.doesNotMatch(query.text, /17171717-1717/);
  }
});

test("verification requires samples in both windows and all thresholds to pass", () => {
  const passing = evaluateVerification(
    [
      { metric: "LATENCY_MS", before: 220, after: 20, beforeSampleCount: 4, afterSampleCount: 4 },
      { metric: "PACKET_LOSS_PCT", before: 18, after: 0.25, beforeSampleCount: 4, afterSampleCount: 4 },
    ],
    [
      { metric: "LATENCY_MS", maximum: 50 },
      { metric: "PACKET_LOSS_PCT", maximum: 1 },
    ],
  );
  assert.equal(passing.passed, true);

  const missingAfter = evaluateVerification(
    [{ metric: "LATENCY_MS", before: 220, after: null, beforeSampleCount: 4, afterSampleCount: 0 }],
    [{ metric: "LATENCY_MS", maximum: 50 }],
  );
  assert.equal(missingAfter.passed, false);
});
