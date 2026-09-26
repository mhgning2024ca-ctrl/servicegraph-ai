# 18 — AI / Gemini / Backboard Agent A4 Task Contract

Agent ID: A4
Role: AI reasoning and operational memory
Branch: feature/ai-engine
Status: READY

## Owned paths
- services/ai/**
- services/memory/backboard/**

## Read before coding
- AGENTS.md
- docs/00_MASTER_SPEC.md
- docs/03_API_DATA_CONTRACTS.md
- docs/04_AI_INTEGRATION_STANDARD.md
- docs/12_EXTERNAL_SERVICES_REGISTRY.md
- docs/15_SHARED_FILES_RUNTIME.md

## Mandatory deliverables
1. Gemini client adapter using @google/genai.
2. complaint classification function.
3. incident/root-cause analysis function.
4. remediation recommendation function.
5. bilingual communication draft function.
6. versioned prompts.
7. Zod validation for every structured output.
8. deterministic mock adapter.
9. Backboard client boundary.
10. historical-memory retrieval/store helpers.
11. provider health/degraded reporting.

## Gemini model
Use GEMINI_MODEL from environment.
Default documented model is used only when available.
No silent substitution.

## Safety
Gemini cannot:
- approve
- execute
- mutate incident state
- fabricate telemetry
- declare verified recovery

## Acceptance
- valid structured result passes schema
- malformed result is rejected
- evidence IDs are validated against input packet
- unavailable Gemini returns typed degraded result
- Backboard unavailable does not break analysis pipeline
- no provider key in source/logs

## Forbidden
- direct DB schema modification
- simulator execution
- autonomous remediation
- direct push to main
