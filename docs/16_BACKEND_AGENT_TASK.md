# 16 — Backend Agent A2 Task Contract

Agent ID: A2
Role: Backend Core
Branch: feature/backend-core
Status: READY

## Owned paths
- apps/api/**
- packages/contracts/** only when implementing already-documented contracts
- backend-local utilities under apps/api/**

## Read before coding
- AGENTS.md
- docs/00_MASTER_SPEC.md
- docs/01_SYSTEM_ARCHITECTURE.md
- docs/03_API_DATA_CONTRACTS.md
- docs/04_AI_INTEGRATION_STANDARD.md
- docs/12_EXTERNAL_SERVICES_REGISTRY.md
- docs/13_SECURITY_RBAC_MATRIX.md
- docs/14_DATABASE_PHYSICAL_SCHEMA.md
- docs/15_SHARED_FILES_RUNTIME.md

## Mandatory deliverables
1. Fastify TypeScript application.
2. Zod request/response validation.
3. Canonical error envelope.
4. Correlation ID middleware.
5. Health endpoints.
6. Report routes.
7. Incident routes.
8. Remediation routes.
9. Simulator orchestration routes.
10. SSE stream.
11. Audit event emission.
12. Server-side authorization hooks compatible with A5 Auth0 middleware.
13. Integration interfaces for A3/A4/A5.

## Required routes
Implement exactly the routes frozen in docs/03 and docs/13.
Do not invent alternate route names.

## Domain state rules
Incident lifecycle must match docs/00.
No route may skip required human approval.
Execution is simulator-only in MVP.

## Integration boundaries
A2 does NOT implement provider SDK logic owned by A4/A5.
A2 consumes typed adapter interfaces and handles unavailable/degraded results.

## Acceptance
- pnpm typecheck passes
- API starts without external credentials using deterministic mocks
- health/live works
- invalid payloads return canonical errors
- unauthorized protected operations return 401/403
- report -> incident -> proposal -> approval -> execution -> verify orchestration can be exercised with mocks
- no secrets committed

## Forbidden
- schema changes without contract update
- direct Gemini SDK calls inside route handlers
- direct ElevenLabs SDK calls inside route handlers
- bypassing A3 repository/data layer
- direct push to main
