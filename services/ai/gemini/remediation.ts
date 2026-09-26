import type { IntegrationResult } from "../src/integration-result.js";
import type { RemediationOutput } from "../src/schemas/outputs.js";
import type { AnalyzeRequest, GeminiClient, ValidatedAiResult } from "./client.js";

export function recommendRemediation(
  client: GeminiClient,
  request: AnalyzeRequest,
): Promise<IntegrationResult<ValidatedAiResult<RemediationOutput>>> {
  return client.recommendRemediation(request);
}
