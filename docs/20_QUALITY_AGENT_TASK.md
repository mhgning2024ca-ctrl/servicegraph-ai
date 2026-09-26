# 20 — Quality Agent A6 Task Contract

Agent ID: A6
Role: Contract, integration, security and demo quality
Branch: feature/quality
Status: READY AFTER FIRST IMPLEMENTATION COMMITS

## Owned paths
- tests/**
- scripts/quality/**

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

## Acceptance
Provide reproducible commands and concise failure reports.
