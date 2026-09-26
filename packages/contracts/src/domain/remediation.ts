import { z } from "zod";

import {
  JsonObjectSchema,
  NullableUuidSchema,
  UtcTimestampSchema,
  UuidSchema,
} from "./common.js";

export const RemediationRiskSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type RemediationRisk = z.infer<typeof RemediationRiskSchema>;

export const RemediationActionTypeSchema = z.enum([
  "REROUTE_TRAFFIC",
  "RESTART_SIMULATED_NODE",
  "THROTTLE_LOAD",
  "NO_ACTION",
]);
export type RemediationActionType = z.infer<typeof RemediationActionTypeSchema>;

export const RemediationProposalStateSchema = z.enum([
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "EXECUTED",
  "SUPERSEDED",
]);

export const RemediationProposalSchema = z.object({
  id: UuidSchema,
  incidentId: UuidSchema,
  version: z.number().int().positive(),
  createdAt: UtcTimestampSchema,
  createdBy: z.enum(["GEMINI", "RULE_ENGINE", "OPERATOR"]),
  actionType: RemediationActionTypeSchema,
  targetNodeId: NullableUuidSchema,
  parameters: JsonObjectSchema,
  rationale: z.string(),
  expectedEffect: z.string(),
  risk: RemediationRiskSchema,
  evidenceIds: z.array(UuidSchema),
  state: RemediationProposalStateSchema,
});
export type RemediationProposal = z.infer<typeof RemediationProposalSchema>;

export const ApprovalDecisionTypeSchema = z.enum(["APPROVE", "REJECT"]);
export type ApprovalDecisionType = z.infer<typeof ApprovalDecisionTypeSchema>;

export const ApprovalDecisionSchema = z.object({
  id: UuidSchema,
  proposalId: UuidSchema,
  proposalVersion: z.number().int().positive(),
  decidedAt: UtcTimestampSchema,
  decision: ApprovalDecisionTypeSchema,
  actorSubject: z.string(),
  actorRole: z.enum(["INCIDENT_MANAGER", "ADMINISTRATOR"]),
  comment: z.string().nullable(),
});
export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

export const RemediationExecutionSchema = z.object({
  id: UuidSchema,
  proposalId: UuidSchema,
  startedAt: UtcTimestampSchema,
  completedAt: UtcTimestampSchema.nullable(),
  state: z.enum(["PENDING", "RUNNING", "SUCCEEDED", "FAILED"]),
  simulatorActionId: z.string().nullable(),
  resultSummary: z.string().nullable(),
});
export type RemediationExecution = z.infer<typeof RemediationExecutionSchema>;

export const VerificationSnapshotSchema = z.object({
  id: UuidSchema,
  incidentId: UuidSchema,
  executionId: UuidSchema,
  createdAt: UtcTimestampSchema,
  windowStart: UtcTimestampSchema,
  windowEnd: UtcTimestampSchema,
  passed: z.boolean(),
  checks: z.array(
    z.object({
      metric: z.string(),
      before: z.number(),
      after: z.number(),
      threshold: z.number(),
      passed: z.boolean(),
    }),
  ),
});
export type VerificationSnapshot = z.infer<typeof VerificationSnapshotSchema>;
