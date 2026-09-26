import { z } from "zod";

import { UtcTimestampSchema, UuidSchema } from "../domain/common.js";

export const ScenarioKeyParamsSchema = z.object({ scenarioKey: z.literal("node17-degradation") });
export const ScenarioIdParamsSchema = z.object({ scenarioId: UuidSchema });

export const StartScenarioRequestSchema = z.object({
  speed: z.number().positive(),
});
export type StartScenarioRequest = z.infer<typeof StartScenarioRequestSchema>;

export const ScenarioStateSchema = z.enum(["RUNNING", "DEGRADED", "RECOVERING", "RECOVERED", "RESET"]);

export const ScenarioResponseSchema = z.object({
  scenarioId: UuidSchema,
  scenarioKey: z.literal("node17-degradation"),
  state: ScenarioStateSchema,
  startedAt: UtcTimestampSchema,
  speed: z.number().positive(),
  targetNodeId: UuidSchema,
});
export type ScenarioResponse = z.infer<typeof ScenarioResponseSchema>;
