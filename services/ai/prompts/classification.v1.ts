export const CLASSIFICATION_PROMPT_VERSION = "classification.v1";

export function renderClassificationPrompt(text: string, sourceLanguage: string | null): string {
  return [
    "Classify this customer report into concise machine-readable symptom codes.",
    "Do not invent infrastructure evidence, telemetry, or incident state.",
    "Return only JSON matching the requested schema.",
    `Source language: ${sourceLanguage ?? "unknown"}`,
    `Report: ${JSON.stringify(text)}`,
  ].join("\n");
}
