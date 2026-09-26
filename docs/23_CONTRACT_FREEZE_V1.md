# 23 — Contract Freeze V1

Version: 1.1.0
Status: FROZEN FOR PARALLEL IMPLEMENTATION
Date: 2026-09-26

## Purpose
This file identifies what is frozen enough for implementation agents to proceed in parallel and what is mandatory for the project to be considered deliverable.

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
- automated CI is mandatory
- build/typecheck/test/contract/security gates are mandatory
- CI workflow location is `.github/workflows/ci.yml`
- deployment/runtime verification is mandatory before demo-ready status
- desktop and mobile verification are mandatory
- provider degraded modes are mandatory
- canonical end-to-end demo verification is mandatory

## Delivery completeness principle
No required feature or engineering gate may be silently removed, deferred, or reclassified as optional merely to meet the deadline.

If something cannot be completed because of a real external blocker, its status must be explicitly recorded as BLOCKED with owner, dependency and fallback. All independent work must continue.

The project may not be called complete because code exists. Completion requires implementation + integration + automated verification + live/demo verification for the relevant feature.

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
- CI mandatory gate
- required demo acceptance criterion

## Human credentials still required
Implementation may use deterministic mocks until human provides:
- Gemini API key
- ElevenLabs API key/voice
- Auth0 config
- TigerData DATABASE_URL
- Backboard API key/assistant
- Vultr host/SSH
- optional domain/DNS

Missing credentials are NOT blockers for adapter implementation, automated local tests, deterministic mocks or unrelated integration work.

## Mandatory verification layers
1. dependency install from lockfile.
2. typecheck.
3. production build.
4. unit/component tests.
5. frozen-contract tests.
6. runtime-contract implementation checks.
7. secret scan.
8. FR/EN/PWA/responsive static smoke.
9. running API smoke.
10. canonical end-to-end scenario.
11. real sponsor/provider integration verification where credentials are available.
12. Vultr deployed runtime smoke.
13. desktop and mobile browser verification.
14. final pre-demo reset/recovery rehearsal.

## Freeze release
A shared contract or mandatory delivery-gate change requires:
1. decision log entry
2. normative doc update
3. impacted-agent notification
4. integration regression test
5. CI green result after the change
