# 20 — Quality Agent A6 Task Contract

Agent ID: A6
Role: Contract, integration, security and demo quality
Branch: feature/quality
Status: ACTIVE

## Owned paths
- tests/**
- scripts/quality/**

The shared CI workflow is maintained on the integration branch by A7, but A6 defines and verifies its required quality gates.

## Mandatory deliverables
1. contract validation tests.
2. API smoke tests.
3. unauthorized approval rejection test.
4. idempotency test.
5. simulator determinism test.
6. Gemini malformed-output rejection test.
7. provider degraded-mode tests.
8. FR/EN smoke test.
9. mobile/desktop viewport smoke checklist.
10. secret scan command/check.
11. end-to-end canonical demo test.
12. CI quality-gate specification and verification.
13. concise defect report with owner, severity, reproduction command and blocking status.

## Mandatory CI gates
The repository MUST contain `.github/workflows/ci.yml` and it MUST run automatically on pushes to `main`, `integration`, and feature branches, plus pull requests targeting `main` or `integration`.

At minimum CI MUST execute:
1. Node.js 22 setup.
2. pnpm 10.18.3 setup.
3. `pnpm install --frozen-lockfile`.
4. `pnpm typecheck`.
5. `pnpm build`.
6. `pnpm test`.
7. frozen contract checks.
8. runtime contract implementation checks.
9. component quality suites.
10. frontend FR/EN + PWA + responsive static smoke.
11. committed-secret scan.

A green CI result is mandatory before claiming an integrated commit is technically validated. Runtime smoke/E2E tests that require live services or human credentials remain separate mandatory demo gates and must never be reported as passed merely because static CI is green.

## Canonical E2E
report
-> correlation
-> incident
-> root cause
-> proposal
-> human approval
-> simulated execution
-> verification
-> communication

## Rules
A6 reports failures to owners.
A6 must not redesign another subsystem to make tests pass.
A6 must not downgrade or remove a failing quality gate to obtain a green build.
A blocked live-provider test must be reported as BLOCKED, never PASS.

## Acceptance
Provide reproducible commands, CI evidence, concise failure reports, and explicit separation between:
- PASS
- FAIL
- BLOCKED awaiting runtime/credential/human action.
