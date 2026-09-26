import type { IncidentStatus } from "@servicegraph/contracts";

import { ApiError } from "./api-error.js";

const ALLOWED_TRANSITIONS: Readonly<Record<IncidentStatus, readonly IncidentStatus[]>> = {
  DETECTED: ["INVESTIGATING"],
  INVESTIGATING: ["CONFIRMED"],
  CONFIRMED: ["REMEDIATION_PROPOSED"],
  REMEDIATION_PROPOSED: ["AWAITING_APPROVAL"],
  AWAITING_APPROVAL: ["REJECTED", "REMEDIATING"],
  REJECTED: [],
  REMEDIATING: ["VERIFYING"],
  VERIFYING: ["INVESTIGATING", "RESOLVED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

export function assertIncidentTransition(
  from: IncidentStatus,
  to: IncidentStatus,
): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new ApiError({
      code: "INVALID_STATE_TRANSITION",
      statusCode: 409,
      message: `Incident cannot transition from ${from} to ${to}.`,
    });
  }
}
