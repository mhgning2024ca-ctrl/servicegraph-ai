import { z } from "zod";

import { UuidSchema } from "../domain/common.js";
import { ApprovalDecisionTypeSchema } from "../domain/remediation.js";

export const ProposalIdParamsSchema = z.object({ proposalId: UuidSchema });

export const RemediationDecisionRequestSchema = z.object({
  proposalVersion: z.number().int().positive(),
  decision: ApprovalDecisionTypeSchema,
  comment: z.string().nullable(),
});
export type RemediationDecisionRequest = z.infer<
  typeof RemediationDecisionRequestSchema
>;
