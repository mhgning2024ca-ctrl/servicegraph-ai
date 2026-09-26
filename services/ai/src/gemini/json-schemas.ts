export const rootCauseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "label",
    "targetNodeId",
    "confidence",
    "rationale",
    "evidenceIds",
    "assumptions",
    "alternativeHypotheses",
  ],
  properties: {
    label: { type: "string" },
    targetNodeId: { type: ["string", "null"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    rationale: { type: "string" },
    evidenceIds: { type: "array", items: { type: "string" } },
    assumptions: { type: "array", items: { type: "string" } },
    alternativeHypotheses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "targetNodeId", "confidence"],
        properties: {
          label: { type: "string" },
          targetNodeId: { type: ["string", "null"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
  },
} as const;

export const remediationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "actionType",
    "targetNodeId",
    "parameters",
    "rationale",
    "expectedEffect",
    "risk",
    "evidenceIds",
    "assumptions",
  ],
  properties: {
    actionType: {
      type: "string",
      enum: [
        "REROUTE_TRAFFIC",
        "RESTART_SIMULATED_NODE",
        "THROTTLE_LOAD",
        "NO_ACTION",
      ],
    },
    targetNodeId: { type: ["string", "null"] },
    parameters: {
      type: "object",
      additionalProperties: { type: ["string", "number", "boolean"] },
    },
    rationale: { type: "string" },
    expectedEffect: { type: "string" },
    risk: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
    evidenceIds: { type: "array", items: { type: "string" } },
    assumptions: { type: "array", items: { type: "string" } },
  },
} as const;
