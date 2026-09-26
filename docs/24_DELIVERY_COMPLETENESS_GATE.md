# 24 — Delivery Completeness Gate

Version: 1.0.0
Status: NORMATIVE / MANDATORY
Date: 2026-09-26
Deadline context: hackathon submission and judging readiness

## Purpose
This document is the single delivery-completeness checklist for ServiceGraph AI.

No agent may treat a category below as optional unless a normative project decision explicitly removes it. Deadline pressure may change execution order, but it does not silently remove required functionality.

Status vocabulary is strict:
- PASS — implemented and verified by the required evidence.
- FAIL — implemented or attempted, but verification failed.
- BLOCKED — cannot currently be verified because of a named external/human dependency.
- NOT RUN — verification has not yet been executed.
- NOT IMPLEMENTED — required implementation is absent.

Never report BLOCKED, NOT RUN or NOT IMPLEMENTED as PASS.

---

## 1. Product surfaces
Mandatory:
- public/landing experience.
- citizen/customer PWA.
- operations/NOC dashboard.
- incident workspace.
- Incident Causal Graph as the primary incident explanation surface.
- report intake by text.
- voice complaint path.
- citizen/public service-status communication.
- operator remediation proposal and approval flow.
- post-remediation verification state.

Verification:
- each required route loads.
- every visible primary action has a defined interaction.
- no placeholder-only surface in the canonical demo path.

## 2. Frontend / UX
Mandatory:
- desktop layout.
- mobile layout.
- tablet/responsive behavior.
- large-desktop behavior.
- FR | EN on all user-facing surfaces.
- persisted language selection.
- no loss of current page/form/incident on language switch.
- PWA manifest/installability baseline.
- loading states.
- empty states.
- error states.
- degraded-provider states.
- keyboard accessibility for critical controls.
- reduced-motion support.
- Incident Causal Graph.
- telemetry visualization.
- incident timeline.
- human approval interaction.
- operational state/status hierarchy.

Canonical demo values must remain contract-valid, including NODE-17 and INC-2048 where specified by the demo dataset.

Verification:
- typecheck/build.
- static FR/EN/PWA/responsive smoke.
- browser verification on desktop and mobile viewport.
- canonical demo traversal.

## 3. Backend Core / API
Mandatory:
- health routes.
- public report creation.
- report idempotency.
- incident listing/detail.
- incident analysis trigger.
- evidence retrieval.
- remediation proposal creation.
- approval/rejection endpoint.
- remediation execution endpoint.
- verification endpoint.
- communications endpoint.
- simulator scenario start/reset functions required by demo.
- SSE event stream.
- canonical error envelope.
- correlation IDs.
- route-level authorization.
- CORS/rate-limit/body-size behavior per frozen docs.

Verification:
- unit tests.
- contract checks.
- running API smoke.
- canonical E2E.

## 4. Shared contracts
Mandatory:
- canonical package `packages/contracts`.
- shared Zod schemas/types.
- no competing public contract definitions in frontend/backend.
- frozen incident states.
- frozen request/response shapes.
- frozen event envelope.

Verification:
- contract build.
- implementation-contract quality test.
- no public-contract drift during integration.

## 5. Database / TigerData / telemetry
Mandatory:
- physical PostgreSQL schema.
- migrations in documented order.
- foreign keys/constraints/indexes.
- deterministic seed/demo dataset.
- telemetry storage.
- TigerData/Timescale time-series path where required.
- NODE-17 degradation/recovery scenario.
- query path needed by incident analysis and verification.
- idempotent simulator-approved action behavior.

Verification:
- migration/seed test.
- data component tests.
- real TigerData path before sponsor claim/demo claim.
- post-action telemetry verification.

## 6. Gemini / AI reasoning
Mandatory:
- real Gemini adapter.
- structured outputs validated before business use.
- complaint classification/correlation contribution.
- root-cause hypothesis.
- confidence.
- evidence IDs/grounding.
- blast-radius/recommendation contribution where specified.
- remediation recommendation.
- malformed-output rejection.
- provider timeout/retry/degraded behavior.
- no autonomous sensitive execution.

Verification:
- deterministic mocked tests.
- malformed/fabricated evidence rejection tests.
- degraded-provider test.
- real structured Gemini call before Gemini integration is claimed live.

## 7. Auth0 / authorization
Mandatory:
- required roles and permissions.
- backend permission enforcement.
- authenticated operator paths.
- privileged approval boundary.
- unauthorized approval rejected server-side.
- fail-closed behavior for privileged operations.

Verification:
- auth component tests.
- API unauthorized smoke.
- real Auth0 role/permission approval demonstration before Auth0 live integration claim.

## 8. ElevenLabs / voice
Mandatory:
- voice input path.
- speech-to-text adapter.
- configured model contract.
- allowed audio validation/limits.
- provider error/degraded behavior.
- multilingual output/voice path where the demo uses it.
- permanent provider secret never exposed to browser.

Verification:
- adapter tests.
- degraded test.
- real voice/transcription demonstration before ElevenLabs live integration claim.

## 9. Backboard / operational memory
Mandatory:
- persistent assistant/memory adapter.
- incident/runbook contextual recall path.
- bounded/failure-safe retrieval.
- explicit degraded state when unavailable.

Verification:
- adapter tests.
- degraded-provider test.
- real memory retrieval before Backboard live integration claim.

## 10. Simulator and safe remediation
Mandatory:
- deterministic degradation scenario.
- deterministic recovery action.
- no execution before required human approval.
- idempotent execution.
- telemetry-based post-action verification.
- incident resolution only after verification.

Verification:
- simulator component tests.
- unauthorized approval test.
- idempotency test.
- canonical E2E.

## 11. Security
Mandatory:
- no committed real secrets.
- `.env.example` documents required variables.
- provider secrets server-side only.
- authorization headers/tokens not logged.
- structured audit history for privileged actions.
- RBAC enforced server-side.
- input validation.
- public endpoint rate/body constraints.
- CORS rules.
- safe error responses.

Verification:
- secret scan.
- auth negative tests.
- contract/security review.

## 12. Observability / operations
Mandatory:
- structured log fields defined by runtime contract.
- health/integration status visibility.
- provider degraded status.
- correlation IDs.
- operational state transitions available to NOC.
- SSE/lifecycle events required for live UI.

Verification:
- API/runtime smoke.
- NOC live-update demo.

## 13. Automated tests
Mandatory layers:
- typecheck.
- production build.
- unit/component tests.
- contract tests.
- implementation-contract tests.
- secret scan.
- FR/EN/PWA/responsive static smoke.
- API smoke.
- canonical E2E.
- browser desktop/mobile verification.
- provider degraded-mode tests.

A test file existing is not evidence that the test passes.

## 14. CI
Mandatory file:
- `.github/workflows/ci.yml`.

Mandatory triggers:
- push to `main`.
- push to `integration`.
- push to `feature/**`.
- pull request targeting `main` or `integration`.

Mandatory CI gates:
- Node 22.
- pnpm 10.18.3.
- frozen-lockfile install.
- typecheck.
- build.
- workspace tests.
- contract checks.
- implementation-contract checks.
- component quality suites.
- FR/EN/PWA/responsive smoke.
- secret scan.

CI must remain green for a commit to be called automatically validated.

## 15. Deployment / Vultr
Mandatory:
- reproducible container/runtime definition.
- required environment variables documented.
- Vultr deployment target.
- API/web reachable through intended runtime topology.
- health check available.
- no secret committed into image/repository.
- restart/recovery procedure.

Verification:
- deployed endpoint smoke.
- web route smoke.
- API health smoke.
- canonical demo rehearsal against deployed environment or truthful documented fallback if an external outage occurs.

## 16. External-service truthfulness
For Gemini, TigerData, Auth0, ElevenLabs, Backboard and Vultr:
- mock implementation may support development.
- mock success must never be presented as real-provider success.
- live sponsor/provider claim requires evidence from the real integration.
- unavailable provider must surface explicit degraded behavior.

## 17. Git / integration discipline
Mandatory:
- feature work stays in owned branches/paths.
- `integration` is the assembly and verification branch.
- no silent contract changes.
- no force overwrite of divergent work.
- semantic conflicts are escalated.
- main receives only deliberately integrated code.

Verification:
- A7 integration report.
- CI result.
- blocker matrix.

## 18. Canonical end-to-end scenario
Mandatory visible chain:

complaint / voice / telemetry
-> normalization
-> telemetry/event storage
-> correlation
-> incident
-> evidence-backed root-cause hypothesis
-> confidence + blast radius
-> remediation proposal
-> authenticated human approval
-> controlled/simulated execution
-> telemetry verification
-> resolved incident
-> citizen/public communication

The demo is incomplete if a required middle stage is merely narrated but not represented by implemented product behavior.

## 19. Demo readiness
Mandatory before declaring DEMO READY:
- all Hard Definition of Done items in `docs/08_DEMO_ACCEPTANCE.md` checked.
- clean startup rehearsed.
- integration CI green.
- API smoke PASS.
- canonical E2E PASS.
- desktop verification PASS.
- mobile verification PASS.
- demo seed/reset PASS.
- operator login/approval path ready.
- external credentials/quota checked.
- degraded fallback behavior known.
- Vultr endpoint reachable.
- Devpost/submission obligations tracked separately and completed before deadline.

## 20. Completion rule
A subsystem is COMPLETE only when all four are true:
1. required implementation exists.
2. integration with its consumers/providers exists.
3. required automated checks pass.
4. required live/demo verification passes, or the external-only portion is explicitly BLOCKED with a named dependency while all independent checks pass.

No agent may report completion based only on source-code presence.

## 21. No-silent-scope-reduction rule
The following are forbidden without an explicit user/project decision:
- deleting a required feature to make tests pass.
- replacing a real-integration requirement with a mock and calling it complete.
- skipping desktop or mobile.
- skipping FR or EN.
- skipping security/authorization checks.
- skipping CI because local tests passed once.
- skipping deployment verification.
- hiding a failing provider behind a fake success state.
- marking tests as passed without executing them.

## 22. Reporting format
Every agent/integration report must use this table conceptually:

| Area | Implementation | Automated verification | Live/demo verification | Status | Blocker/owner |
|---|---|---|---|---|---|

Only PASS/FAIL/BLOCKED/NOT RUN/NOT IMPLEMENTED are allowed status values.

This file is the final completeness gate used together with `docs/08_DEMO_ACCEPTANCE.md` and `docs/23_CONTRACT_FREEZE_V1.md`.
