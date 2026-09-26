# ServiceGraph AI

**From complaint to root cause to safe resolution.**

ServiceGraph AI is an AI-assisted service-operations platform that correlates customer/citizen complaints with live infrastructure telemetry, groups related symptoms into incidents, identifies probable root causes, estimates blast radius, proposes remediation, requires human approval for sensitive actions, and communicates status back to affected users.

## Canonical repository

This GitHub repository is the **single source of truth** for the hackathon project. Code, architecture, contracts, technical documentation, tests, deployment definitions, and integration evidence must be committed here. Real credentials and secret values must never be committed; `.env.example` documents required variables.

## Product principle

Every technology must have a functional role. No sponsor integration, AI call, animation, dashboard widget, API, or infrastructure component may exist only for decoration.

The end-to-end operational loop is:

```text
complaint / voice / telemetry
          ↓
 normalization + timestamping
          ↓
 real-time event store
          ↓
 correlation + AI reasoning
          ↓
 incident graph + root-cause hypothesis
          ↓
 blast-radius + priority
          ↓
 recommended remediation
          ↓
 human authorization
          ↓
 controlled action / simulated action
          ↓
 telemetry verification
          ↓
 customer/citizen communication
```

## Target integrations

- **Gemini** — multimodal/structured reasoning, complaint classification, correlation explanation, root-cause hypothesis, incident summaries and remediation recommendations.
- **TigerData/PostgreSQL** — telemetry, event history, time-series analytics, incident evidence and operational metrics.
- **Auth0** — identity, RBAC, protected operator actions and human authorization boundaries.
- **ElevenLabs** — voice complaint intake and accessible/multilingual incident communication.
- **Backboard** — persistent operational memory for prior incidents, runbooks and contextual recall.
- **Vultr** — primary demo runtime/infrastructure.

## Architecture direction

```text
apps/web          Next.js + TypeScript command center and public portal
apps/api          TypeScript/Fastify service API and orchestration
packages/contracts shared Zod schemas and API/domain types
database/         SQL migrations, seed/demo data, time-series definitions
services/         integration adapters and deterministic simulation services
infrastructure/   Docker and Vultr deployment definitions
docs/             normative project specifications
tests/            integration, contract and end-to-end verification
```

## UI direction

The interface must feel like a modern 2026 operations product, not a generic hackathon dashboard. It will use clear hierarchy, high-information-density cards, live status transitions, incident timelines, a service/network map, a causal incident graph, responsive layouts, restrained motion, keyboard-accessible controls, skeleton/loading states, empty/error states, and visible AI confidence/evidence.

Animations are permitted only when they communicate state change, causality, progress, live updates, focus, or transition context.

## Non-negotiable engineering rules

1. GitHub is canonical.
2. No real secrets in Git history.
3. Shared schemas/contracts are defined before parallel implementation.
4. Frontend mocks must conform exactly to shared contracts.
5. AI output affecting operations must be structured and validated.
6. Sensitive remediation requires an authenticated human approval step.
7. Every important AI conclusion must expose evidence/confidence rather than appearing as unexplained magic.
8. No fake success states: unavailable integrations must degrade explicitly.
9. Every agent works inside an assigned file/domain boundary.
10. A feature is complete only after acceptance criteria and tests pass.

## Documentation index

The project documentation under `docs/` is normative. If code and documentation conflict, the conflict must be resolved explicitly; agents must not silently reinterpret requirements.

Initial documents:

- `00_MASTER_SPEC.md` — authoritative product and execution specification.
- `01_SYSTEM_ARCHITECTURE.md` — runtime architecture and module boundaries.
- `02_UI_UX_STANDARD.md` — visual, interaction and motion specification.
- `03_API_DATA_CONTRACTS.md` — shared data/API rules.
- `04_AI_INTEGRATION_STANDARD.md` — Gemini/AI orchestration and safety boundaries.
- `05_AGENT_EXECUTION_PLAN.md` — parallel-agent responsibilities and sequencing.
- `06_GIT_INTEGRATION_RULES.md` — lightweight Git rules and integration discipline.
- `07_VULTR_DEPLOYMENT.md` — deployment target and runtime requirements.
- `08_DEMO_ACCEPTANCE.md` — demo scenario and Definition of Done.

## Status

Vertical integration and demo-hardening phase. The canonical implementation is assembled on
`integration`; only a CI-green, end-to-end verified commit may be promoted to `main` and
deployed. Provider adapters or UI surfaces are not considered complete until they are wired
into the report-to-recovery runtime path and verified against the real dependency or an
explicitly identified degraded mode.
