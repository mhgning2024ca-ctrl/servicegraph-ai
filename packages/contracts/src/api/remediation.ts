import { z } from "zod";

import { UuidSchema } from "../domain/common.js";
import {
  ApprovalDecisionSchema,
  ApprovalDecisionTypeSchema,
  RemediationActionTypeSchema,
  RemediationExecutionSchema,
  RemediationProposalSchema,
  RemediationRiskSchema,
  VerificationSnapshotSchema,
} from "../domain/remediation.js";

export const ProposalIdParamsSchema = z.object({ proposalId: UuidSchema });

export const CreateRemediationProposalRequestSchema = z.object({
  version: z.number().int().positive().default(1),
  createdBy: z.enum(["GEMINI", "RULE_ENGINE", "OPERATOR"]),
  actionType: RemediationActionTypeSchema,
  targetNodeId: UuidSchema.nullable(),
  parameters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  rationale: z.string().min(1),
  expectedEffect: z.string().min(1),
  risk: RemediationRiskSchema,
  evidenceIds: z.array(UuidSchema),
});
export type CreateRemediationProposalRequest = z.infer<typeof CreateRemediationProposalRequestSchema>;

export const CreateRemediationProposalResponseSchema = z.object({
  proposal: RemediationProposalSchema,
});

export const RemediationDecisionRequestSchema = z.object({
  proposalVersion: z.number().int().positive(),
  decision: ApprovalDecisionTypeSchema,
  comment: z.string().nullable(),
});
export type RemediationDecisionRequest = z.infer<typeof RemediationDecisionRequestSchema>;

export const RemediationDecisionResponseSchema = z.object({
  decision: ApprovalDecisionSchema,
});

export const RemediationExecutionResponseSchema = z.object({
  execution: RemediationExecutionSchema,
});

export const VerificationResponseSchema = z.object({
  verification: VerificationSnapshotSchema,
});
