import type { IntegrationResult } from "../src/integration-result.js";
import type { CommunicationOutput } from "../src/schemas/outputs.js";
import type { DraftCommunicationRequest, GeminiClient, ValidatedAiResult } from "./client.js";

export function draftCommunication(
  client: GeminiClient,
  request: DraftCommunicationRequest,
): Promise<IntegrationResult<ValidatedAiResult<CommunicationOutput>>> {
  return client.draftCommunication(request);
}
