import { z } from "zod";

import { IncidentGraphSchema } from "../domain/incident.js";
import { IncidentStatusSchema, SeveritySchema, UuidSchema } from "../domain/common.js";

export const IncidentIdParamsSchema = z.object({ id: UuidSchema });

export const ListIncidentsQuerySchema = z.object({
  status: IncidentStatusSchema.optional(),
  severity: SeveritySchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  cursor: z.string().optional(),
});
export type ListIncidentsQuery = z.infer<typeof ListIncidentsQuerySchema>;

export const IncidentGraphResponseSchema = IncidentGraphSchema;
export type IncidentGraphResponse = z.infer<typeof IncidentGraphResponseSchema>;
