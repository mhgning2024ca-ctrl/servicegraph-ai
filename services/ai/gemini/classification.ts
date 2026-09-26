import type { IntegrationResult } from "../src/integration-result.js";
import type { ClassificationOutput } from "../src/schemas/outputs.js";
import type { ClassifyReportRequest, GeminiClient, ValidatedAiResult } from "./client.js";

export function classifyReport(
  client: GeminiClient,
  request: ClassifyReportRequest,
): Promise<IntegrationResult<ValidatedAiResult<ClassificationOutput>>> {
  return client.classifyReport(request);
}
