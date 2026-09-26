# 22 — Integration Agent A7 Task Contract

Agent ID: A7
Role: Integration / merge gate / local verification / CI owner
Branch: integration
Status: ACTIVE

## Owned shared integration paths
- integration branch assembly
- `.github/workflows/**`
- root workspace integration files when reconciling already-frozen contracts

## Responsibilities
- fetch all feature branches
- inspect PRs/diffs
- integrate in small increments
- run workspace install/build/typecheck/tests
- verify contract compatibility
- reject semantic conflicts
- maintain `.github/workflows/ci.yml`
- keep CI gates aligned with A6 quality requirements
- maintain a demo-capable integration branch
- prepare only validated commits for main
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
9. final runtime/E2E validation

## Required checks before merge/integration acceptance
- branch based on recent shared contract baseline
- no committed secret
- owned paths respected
- lockfile/install reproducible
- typecheck passes
- build passes
- affected unit/component tests pass
- frozen contract checks pass
- runtime contract implementation checks pass
- FR/EN/PWA/responsive smoke passes for frontend-affecting changes
- no public contract drift
- no duplicate enum/type definitions
- no unapproved provider substitution
- CI workflow remains present and enabled

## CI rule
A7 MUST NOT describe an integration commit as validated until the corresponding automated CI run is green.

The canonical CI workflow must run on pushes to `main`, `integration`, and `feature/**`, and on pull requests targeting `main` or `integration`.

A green static CI run does not replace mandatory live-runtime checks. Before demo readiness, A7 must also execute or coordinate:
- running API smoke
- canonical E2E
- Auth0 privileged approval path
- Gemini real structured call
- TigerData real telemetry path
- ElevenLabs real voice path when credentials are available
- Backboard real memory path when credentials are available
- Vultr deployed endpoint smoke
- desktop/mobile browser verification

If an external credential is unavailable, mark that check BLOCKED and continue all independent checks. Never convert BLOCKED to PASS.

## Conflict handling
Mechanical conflict: may resolve.
Semantic contract conflict: STOP only the affected part and escalate; continue independent integration work.

## Output after each integration
- merged branch/PR
- resulting commit SHA
- commands run
- CI run/result
- pass/fail/blocked matrix
- blockers and owning agent
