# 05 — Parallel Agent Execution Plan

Version: 0.1.0  
Status: NORMATIVE

## 1. Objective

Maximize parallel delivery without allowing agents to invent incompatible contracts or modify overlapping ownership areas.

The project uses **6 production agents + 2 transversal agents**.

## 2. Roles

### A1 — Frontend / PWA / UI

Branch: `feature/frontend`

Owned paths:
- `apps/web/**`
- `packages/ui/**`

Read-only dependencies:
- `packages/contracts/**`
- `docs/00_MASTER_SPEC.md`
- `docs/02_UI_UX_STANDARD.md`
- `docs/03_API_DATA_CONTRACTS.md`

Deliverables:
- citizen mobile-first PWA;
- operations command center;
- incident workspace;
- evidence graph;
- remediation approval UI;
- live/SSE client;
- offline report queue;
- loading/empty/error/degraded states.

May use contract-valid mocks until API is integrated.

Forbidden:
- local duplicate domain enums/types;
- changing API contract;
- fake action buttons.

### A2 — Backend Core

Branch: `feature/backend-core`

Owned paths:
- `apps/api/**` except provider adapters delegated below

Deliverables:
- Fastify/TypeScript API;
- route schemas;
- incident lifecycle;
- correlation orchestration;
- remediation lifecycle;
- verification orchestration;
- SSE event stream;
- audit/correlation IDs.

Dependencies:
- contracts and DB interfaces.

Forbidden:
- changing DB/API contracts unilaterally;
- bypassing Auth0/human approval.

### A3 — Data / TigerData / Simulator

Branch: `feature/data-telemetry`

Owned paths:
- `packages/db/**`
- `database/**`
- `services/simulator/**`
- `scripts/seed/**`

Deliverables:
- schema/migrations;
- TigerData time-series setup;
- seed topology/services;
- NODE-17 deterministic degradation scenario;
- correlation SQL/data access;
- blast-radius support;
- verification metric queries.

Forbidden:
- random/unreproducible demo telemetry;
- renaming contract fields.

### A4 — Gemini / Backboard AI

Branch: `feature/ai-engine`

Owned paths:
- `services/ai/**`
- `services/backboard/**`

Deliverables:
- Gemini adapter;
- prompts with versions;
- structured output validation;
- bounded evidence packet builder interface;
- Backboard adapter and explicit unavailable fallback;
- deterministic mocks/tests.

Forbidden:
- autonomous remediation execution;
- direct DB schema changes.

### A5 — Auth0 / ElevenLabs / Security Integrations

Branch: `feature/auth-voice`

Owned paths:
- `services/auth0/**`
- `services/elevenlabs/**`
- `packages/auth/**`

Deliverables:
- Auth0 token/role/permission middleware;
- canonical role mapping;
- voice transcription adapter;
- TTS adapter;
- integration health endpoints/interfaces;
- deterministic mocks.

Forbidden:
- committing secrets;
- weakening approval rules to simplify demo.

### A6 — Cross-system Test / Quality

Branch: `feature/quality`

Owned paths:
- `tests/**`
- `scripts/quality/**`

Deliverables:
- contract tests;
- integration smoke tests;
- unauthorized approval test;
- idempotency tests;
- end-to-end happy path;
- degraded-provider tests;
- build/test runner documentation.

A6 reports defects; it does not silently rewrite another agent’s subsystem.

### A7 — Integration Agent

Branch: `integration` or coordinator-controlled temporary branch.

Responsibilities:
- inspect PRs;
- verify contract compatibility;
- pull/merge approved branches;
- run complete local environment;
- run build/typecheck/tests;
- report conflicts;
- merge to `main` only after acceptance.

A7 is not a feature developer.

### A8 — Infrastructure / Vultr

Branch: `feature/infrastructure`

Owned paths:
- `infrastructure/**`
- deployment scripts/configuration declared there
- root deployment documentation updates coordinated with owner

Responsibilities:
- Vultr runtime preparation;
- Docker Compose;
- reverse proxy/TLS;
- environment variable contract;
- health checks;
- deployment/rollback procedure;
- SSH/deployment workflow.

A8 consumes application Docker/build interfaces. It must not rewrite app logic.

## 3. Human coordinator responsibilities

Human intervention is REQUIRED for:
- creating/owning external accounts;
- generating API credentials;
- accepting terms/credits;
- creating Vultr instance;
- DNS/domain changes;
- SSH key approval;
- Auth0 tenant/application configuration;
- Devpost submission;
- participant/team administration;
- final physical demonstration.

Secrets are provided to runtime environments only, never chat/repository plaintext if avoidable.

## 4. ChatGPT architecture coordinator responsibilities

The architecture coordinator:
- owns normative docs;
- resolves cross-agent contract questions;
- freezes/unfreezes shared contracts;
- records decisions;
- does not allow hidden architecture drift;
- updates agent instructions after approved contract changes.

## 5. Start order

### Gate 0 — Repository
Human creates public repository and confirms Git access.

### Gate 1 — Contract freeze
Required before implementation agents proceed:
- master spec;
- system architecture;
- UI standard;
- API/data contract;
- AI/integration standard;
- Git protocol;
- agent ownership.

### Gate 2 — Parallel implementation
Start A1–A6 and A8 in parallel.

A1 uses mocks matching shared contracts.
A2 uses shared contracts independent of A1.
A3 makes DB/simulator independently.
A4/A5 expose adapters/mocks independently.
A6 prepares cross-system tests.
A8 prepares runtime.

### Gate 3 — First integration
A7 integrates minimum:
- web shell;
- API health;
- database connectivity;
- seed data;
- simulator trigger;
- incident list.

### Gate 4 — Operational loop integration
Integrate:
- report submission;
- telemetry;
- correlation;
- incident detail;
- Gemini analysis;
- approval;
- execution;
- verification;
- communication.

### Gate 5 — Sponsor integrations
Verify each claimed sponsor integration is live and demonstrable, or remove claim.

### Gate 6 — Demo freeze
No speculative features after demo freeze. Only defects, copy, performance, resilience and submission material.

## 6. Required agent task header

Every agent receives:

```text
AGENT_ID:
ROLE:
BRANCH:
OWNED_PATHS:
READ_ONLY_DEPENDENCIES:
TASK:
REQUIRED_INPUTS:
EXPECTED_OUTPUTS:
ACCEPTANCE_TESTS:
FORBIDDEN_CHANGES:
```

No coding starts without this header.

## 7. Synchronization protocol

At start:
1. fetch origin;
2. checkout assigned branch from current `main`;
3. record base commit;
4. read AGENTS + relevant docs.

During work:
- commit coherent units;
- do not edit outside owned paths;
- pull/merge latest `main` only when required;
- if contract changed on `main`, stop affected implementation and resync.

At handoff:
1. run owned tests;
2. list changed files;
3. list commands/tests executed;
4. state known limitations;
5. open PR to `main`;
6. do not self-merge unless designated A7/coordinator.

## 8. Blocker protocol

Use the exact blocker template in `AGENTS.md`.

Any blocker involving:
- public API;
- DB schema semantics;
- role/permission;
- state machine;
- sponsor integration responsibility;
- cross-agent file ownership

must be escalated before implementation continues.

## 9. Definition of agent success

An agent is successful when its output integrates cleanly and reproducibly, not when it merely generates many files.
