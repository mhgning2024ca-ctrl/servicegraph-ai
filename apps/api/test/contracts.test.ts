import {
  CustomerReportSchema,
  IncidentStatusSchema,
  OperationalEventEnvelopeSchema,
  RemediationProposalSchema,
} from "@servicegraph/contracts";
import { describe, expect, it } from "vitest";

describe("shared contract guards", () => {
  it("rejects undeclared enum values", () => {
    expect(IncidentStatusSchema.safeParse("AI_ANALYZING").success).toBe(false);
  });

  it("rejects non-UUID entity identifiers", () => {
    expect(CustomerReportSchema.safeParse({ id: "report-1" }).success).toBe(false);
    expect(RemediationProposalSchema.safeParse({ id: "proposal-1" }).success).toBe(false);
  });

  it("rejects undeclared SSE event types", () => {
    expect(OperationalEventEnvelopeSchema.safeParse({ type: "telemetry.sample" }).success).toBe(false);
  });
});
