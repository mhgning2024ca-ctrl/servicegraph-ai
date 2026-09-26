# 22 — Integration Agent A7 Task Contract

Agent ID: A7
Role: Integration / merge gate / local verification
Branch: integration
Status: READY WHEN MULTIPLE FEATURE BRANCHES HAVE COMMITS

## Responsibilities
- fetch all feature branches
- inspect PRs/diffs
- integrate in small increments
- run workspace install/build/typecheck/tests
- verify contract compatibility
- reject semantic conflicts
- maintain demo-capable main
- never invent new cross-system contracts

## Merge order preference
1. shared contracts
2. DB/migrations/simulator
3. backend shell
4. auth middleware
5. AI adapters
6. frontend integration
7. quality tests
8. infrastructure deployment

## Required checks before merge
- branch based on recent main
- no secret
- owned paths respected
- typecheck/build passes
- affected tests pass
- no public contract drift
- no duplicate enum/type definitions
- no unapproved provider substitution

## Conflict handling
Mechanical conflict: may resolve.
Semantic contract conflict: STOP and escalate.

## Output after each integration
- merged branch/PR
- resulting commit SHA
- commands run
- pass/fail
- blockers
