import type { IntegrationResult } from "../src/integration-result.js";
import type { RootCauseOutput } from "../src/schemas/outputs.js";
import type { AnalyzeRequest, GeminiClient, ValidatedAiResult } from "./client.js";

export function analyzeRootCause(
  client: GeminiClient,
  request: AnalyzeRequest,
): Promise<IntegrationResult<ValidatedAiResult<RootCauseOutput>>> {
  return client.analyzeRootCause(request);
}
