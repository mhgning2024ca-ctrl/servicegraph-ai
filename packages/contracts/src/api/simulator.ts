import { z } from "zod";

export const ScenarioKeyParamsSchema = z.object({ scenarioKey: z.literal("node17-degradation") });

export const StartScenarioRequestSchema = z.object({
  speed: z.number().positive(),
});
export type StartScenarioRequest = z.infer<typeof StartScenarioRequestSchema>;
