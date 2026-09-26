import { z } from "zod";

import {
  ConfidenceSchema,
  IncidentStatusSchema,
  InfrastructureNodeStatusSchema,
  JsonObjectSchema,
  NullableUuidSchema,
  ScalarMetadataSchema,
  SeveritySchema,
  UtcTimestampSchema,
  UuidSchema,
} from "./common.js";

export const ServiceSchema = z.object({
  id: UuidSchema,
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  publicVisible: z.boolean(),
  status: InfrastructureNodeStatusSchema,
});
export type Service = z.infer<typeof ServiceSchema>;

export const InfrastructureNodeSchema = z.object({
  id: UuidSchema,
  code: z.string(),
  name: z.string(),
  type: z.enum(["ROUTER", "SWITCH", "EDGE", "ACCESS", "SERVICE"]),
  status: InfrastructureNodeStatusSchema,
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  areaCode: z.string().nullable(),
  metadata: ScalarMetadataSchema,
});
export type InfrastructureNode = z.infer<typeof InfrastructureNodeSchema>;

export const IncidentSummarySchema = z.object({
  id: UuidSchema,
  incidentNumber: z.string(),
  title: z.string(),
  status: IncidentStatusSchema,
  severity: SeveritySchema,
  createdAt: UtcTimestampSchema,
  updatedAt: UtcTimestampSchema,
  startedAt: UtcTimestampSchema.nullable(),
  resolvedAt: UtcTimestampSchema.nullable(),
  affectedUsersEstimate: z.number().int().nonnegative(),
  affectedServiceIds: z.array(UuidSchema),
  affectedAreaCodes: z.array(z.string()),
  probableRootNodeId: NullableUuidSchema,
  rootCauseConfidence: ConfidenceSchema.nullable(),
});
export type IncidentSummary = z.infer<typeof IncidentSummarySchema>;

export const IncidentEvidenceSchema = z.object({
  id: UuidSchema,
  incidentId: UuidSchema,
  type: z.enum([
    "CUSTOMER_REPORT",
    "TELEMETRY_ANOMALY",
    "TOPOLOGY",
    "HISTORICAL_INCIDENT",
    "OPERATOR_NOTE",
  ]),
  sourceId: UuidSchema,
  summary: z.string(),
  observedAt: UtcTimestampSchema,
  weight: z.number(),
});
export type IncidentEvidence = z.infer<typeof IncidentEvidenceSchema>;

export const RootCauseHypothesisSchema = z.object({
  id: UuidSchema,
  incidentId: UuidSchema,
  createdAt: UtcTimestampSchema,
  label: z.string(),
  targetNodeId: NullableUuidSchema,
  confidence: ConfidenceSchema,
  rationale: z.string(),
  evidenceIds: z.array(UuidSchema),
  assumptions: z.array(z.string()),
  modelProvider: z.enum(["GEMINI", "RULE_ENGINE"]),
  modelName: z.string().nullable(),
  promptVersion: z.string().nullable(),
});
export type RootCauseHypothesis = z.infer<typeof RootCauseHypothesisSchema>;

export const BlastRadiusSnapshotSchema = z.object({
  id: UuidSchema,
  incidentId: UuidSchema,
  createdAt: UtcTimestampSchema,
  affectedUsersEstimate: z.number().int().nonnegative(),
  affectedServiceIds: z.array(UuidSchema),
  affectedAreaCodes: z.array(z.string()),
  affectedNodeIds: z.array(UuidSchema),
});
export type BlastRadiusSnapshot = z.infer<typeof BlastRadiusSnapshotSchema>;

export const IncidentGraphNodeSchema = z.object({
  id: z.string(),
  category: z.enum([
    "REPORT",
    "SERVICE",
    "AREA",
    "INFRASTRUCTURE_NODE",
    "TELEMETRY_ANOMALY",
    "HYPOTHESIS",
    "REMEDIATION",
  ]),
  label: z.string(),
  status: z.string().nullable(),
  metadata: JsonObjectSchema,
});

export const IncidentGraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.enum([
    "REPORT_AFFECTS_SERVICE",
    "REPORT_LOCATED_IN_AREA",
    "SERVICE_DEPENDS_ON_NODE",
    "TELEMETRY_OBSERVED_ON_NODE",
    "EVIDENCE_SUPPORTS_HYPOTHESIS",
    "PROPOSAL_TARGETS_NODE",
  ]),
});

export const IncidentGraphSchema = z.object({
  nodes: z.array(IncidentGraphNodeSchema),
  edges: z.array(IncidentGraphEdgeSchema),
});
export type IncidentGraph = z.infer<typeof IncidentGraphSchema>;
