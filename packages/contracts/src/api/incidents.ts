import { z } from "zod";

import {
  BlastRadiusSnapshotSchema,
  IncidentEvidenceSchema,
  IncidentGraphSchema,
  IncidentSummarySchema,
  RootCauseHypothesisSchema,
} from "../domain/incident.js";
import { IntegrationStateSchema, IncidentStatusSchema, SeveritySchema, UuidSchema } from "../domain/common.js";
import { RemediationProposalSchema } from "../domain/remediation.js";

export const IncidentIdParamsSchema = z.object({ id: UuidSchema });

export const ListIncidentsQuerySchema = z.object({
  status: IncidentStatusSchema.optional(),
  severity: SeveritySchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  cursor: z.string().optional(),
});
export type ListIncidentsQuery = z.infer<typeof ListIncidentsQuerySchema>;

export const ListIncidentsResponseSchema = z.object({
  items: z.array(IncidentSummarySchema),
  nextCursor: z.string().nullable(),
});
export type ListIncidentsResponse = z.infer<typeof ListIncidentsResponseSchema>;

export const IncidentDetailResponseSchema = z.object({
  incident: IncidentSummarySchema,
  rootCauseHypothesis: RootCauseHypothesisSchema.nullable(),
  blastRadius: BlastRadiusSnapshotSchema.nullable(),
  remediationProposal: RemediationProposalSchema.nullable(),
  integrationStates: z.array(z.object({
    provider: z.string(),
    state: IntegrationStateSchema,
    checkedAt: z.string(),
    reasonCode: z.string().nullable(),
  })),
});
export type IncidentDetailResponse = z.infer<typeof IncidentDetailResponseSchema>;

export const IncidentEvidenceResponseSchema = z.object({
  evidence: z.array(IncidentEvidenceSchema),
});
export type IncidentEvidenceResponse = z.infer<typeof IncidentEvidenceResponseSchema>;

export const IncidentGraphResponseSchema = IncidentGraphSchema;
export type IncidentGraphResponse = z.infer<typeof IncidentGraphResponseSchema>;

export const AnalyzeIncidentResponseSchema = z.object({
  operationId: UuidSchema,
  status: z.literal("ACCEPTED"),
});
export type AnalyzeIncidentResponse = z.infer<typeof AnalyzeIncidentResponseSchema>;
