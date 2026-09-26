# Quality defect report — 2026-09-26 UTC

Observed refs were fetched immediately before this report. These are integration blockers, not claims that unfinished owners have completed their work.

## Q-001 — Shared runtime contracts absent

```text
BLOCKER_ID: Q-001
Agent: A6 Quality; owner/action: A2 / integration coordinator
File/Subsystem: packages/contracts/**
Expected contract: docs/03_API_DATA_CONTRACTS.md section 1 and docs/15_SHARED_FILES_RUNTIME.md require canonical Zod schemas imported by web and API.
Observed ambiguity/conflict: packages/contracts is absent from main and all fetched implementation diffs inspected by A6.
Work that can continue safely: normative-document checks, secret scan, isolated provider/data tests.
Decision required: implement the already-documented shared schemas in the canonical paths before claiming contract or E2E readiness.
```

## Q-002 — API demo path is not yet testable

```text
BLOCKER_ID: Q-002
Agent: A6 Quality; owner/action: A2 Backend Core
File/Subsystem: apps/api/** at feature/backend-core commit 6556b70
Expected contract: docs/16_BACKEND_AGENT_TASK.md requires reports, incidents, remediation, simulator orchestration, health and SSE routes.
Observed ambiguity/conflict: fetched branch contains the API infrastructure shell and event bus, but no canonical route modules beyond infrastructure registration.
Work that can continue safely: infrastructure/error/correlation unit tests and independent component checks.
Decision required: finish the frozen routes without changing their methods, paths, payloads, RBAC or state rules.
```

## Q-003 — Reproducible workspace install is absent

```text
BLOCKER_ID: Q-003
Agent: A6 Quality; owner/action: A7 Integration / shared-runtime owner
File/Subsystem: repository root
Expected contract: docs/15_SHARED_FILES_RUNTIME.md requires package.json, pnpm-workspace.yaml and pnpm-lock.yaml; docs/08 requires clean documented startup.
Observed ambiguity/conflict: the required root workspace files are absent from main and the fetched feature diffs inspected by A6.
Work that can continue safely: dependency-free contract/secret checks and source review.
Decision required: integrate the frozen root workspace/runtime baseline so component suites can install and run reproducibly.
```

## Reviewed component coverage

- A3 includes deterministic NODE-17 degradation/recovery and idempotent approved-action tests.
- A4 includes malformed/fabricated evidence rejection, bounded evidence, transient retry and degraded Gemini tests.
- A5 includes fail-closed authorization, unauthorized operator approval rejection, voice input policy and degraded provider tests.
- Runtime/API-level enforcement remains unproven until Q-001–Q-003 are resolved and branches are integrated.

## Q-004 — Resolved: frozen public, voice and telemetry route registration

```text
BLOCKER_ID: Q-004 (resolved on integration@6a1f267)
Agent: A6 Quality; owner/action: A2 Backend Core / A7 integration coordinator
File/Subsystem: apps/api/src/app/create-api-app.ts, apps/api/src/modules/**
Expected contract: frozen routes must expose GET /v1/reports/:id, POST /v1/telemetry, public config/status and affected-confirmation paths, and POST /v1/voice/transcriptions in the application runtime.
Observed ambiguity/conflict: resolved by integration@6a1f267: report-read and telemetry handlers are present, and createApiApp() registers telemetry, public and voice routes.
Work that can continue safely: `tests/quality/frozen-route-inventory.mjs` is now a mandatory CI gate and protects this registration set against regression.
Decision required: none for route registration; provide live persisted credentials to execute the separate strict E2E.
```
