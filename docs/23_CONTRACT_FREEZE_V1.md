# 23 — Contract Freeze V1

Version: 1.0.0
Status: FROZEN FOR PARALLEL IMPLEMENTATION
Date: 2026-09-26

## Purpose
This file identifies what is frozen enough for implementation agents to proceed in parallel.

## Frozen shared decisions
- product name and core loop
- canonical stack
- repository layout
- incident lifecycle
- domain entities
- physical DB baseline
- route paths
- API error envelope
- RBAC roles and permissions
- Gemini responsibility and structured outputs
- ElevenLabs responsibility
- Backboard responsibility
- TigerData responsibility
- Vultr runtime role
- SSE endpoint/event family
- idempotency behavior
- CORS principle
- environment variable names
- shared package/file paths
- frontend identity, responsive behavior and FR|EN requirement
- Git/branch ownership
- human approval boundary

## Implementation autonomy remains allowed for
- private helpers
- internal function/class decomposition
- local test fixture organization
- private non-shared types
- internal SQL query implementation preserving schema/semantics
- CSS/component implementation details preserving UI spec
- logging library choice if it emits required fields and does not alter deployment contract

## Mandatory escalation
Agents MUST escalate before changing:
- route name/method
- public request/response
- DB table/column semantics
- enum/state
- role/permission
- external provider/model choice
- environment variable contract
- shared file path
- deployment public port
- security boundary
- human approval rule

## Human credentials still required
Implementation may use deterministic mocks until human provides:
- Gemini API key
- ElevenLabs API key/voice
- Auth0 config
- TigerData DATABASE_URL
- Backboard API key/assistant
- Vultr host/SSH
- optional domain/DNS

Missing credentials are NOT blockers for adapter implementation or local mock integration.

## Freeze release
A shared contract change requires:
1. decision log entry
2. normative doc update
3. impacted-agent notification
4. integration regression test
