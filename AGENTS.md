# ServiceGraph AI — Agent Execution Contract

Version: 0.1.0
Status: NORMATIVE
Canonical repository: `mhgning2024ca-ctrl/servicegraph-ai`

This file applies to every ChatGPT/Codex agent and every human contributor working in this repository.

## 1. Authority order

When instructions conflict, use this order:

1. `docs/00_MASTER_SPEC.md`
2. the dedicated document for the subsystem being changed
3. shared contracts in `packages/contracts`
4. database migrations and API schemas already merged on `main`
5. the assigned task statement
6. implementation details chosen by the agent

An agent MUST NOT silently reinterpret a higher-authority requirement.

## 2. Core rule

If a required behavior, field, route, permission, state transition, integration contract, or acceptance rule is not defined, STOP that part of the implementation and record the ambiguity. Do not invent a contract that other agents would have to discover later.

## 3. Non-negotiable project invariants

- GitHub `main` is the canonical source of truth.
- The project name is **ServiceGraph AI**.
- Product loop: complaint/telemetry → evidence correlation → incident → probable root cause → blast radius → remediation recommendation → human authorization → controlled action/simulation → telemetry verification → customer communication.
- Citizen experience is mobile-first and installable as a PWA.
- Operations/NOC experience is desktop-first and high-information-density.
- Every sponsor technology used must perform a real product function. Decorative integrations are forbidden.
- AI never performs a sensitive remediation autonomously.
- AI conclusions that affect operations must expose structured evidence and confidence.
- Fake success states are forbidden. If an external integration fails, the UI/API must report degraded/unavailable state explicitly.
- The network control plane in the MVP is a clearly labeled deterministic simulator/digital twin unless a real authorized control API is provided.
- No real API key, database password, private key, token, or secret value is committed to GitHub.
- The complete application architecture, integration code, tests, contracts, deployment definitions, `.env.example`, and documentation remain visible in GitHub.

## 4. Allowed implementation autonomy

An agent MAY choose local implementation details only when they do not alter:

- API paths or response shapes;
- database table/column semantics;
- shared domain states;
- role/permission names;
- file ownership boundaries;
- UX flows declared normative;
- sponsor integration responsibilities;
- acceptance criteria.

Examples of allowed choices: internal helper names, private function decomposition, test fixture organization, local variable names, non-user-visible refactoring.

## 5. Forbidden unilateral actions

Without an explicit spec update, an agent MUST NOT:

- rename or remove a public API route;
- add a new required field to a shared payload;
- change an enum value;
- replace a selected technology;
- bypass Auth0 authorization;
- bypass human approval for remediation;
- hard-code secrets or environment-dependent URLs;
- remove an integration because it is temporarily unavailable;
- fabricate telemetry, AI output, or network success while labeling it as live/real;
- change the product name, user roles, primary navigation, or canonical architecture;
- push feature work directly to `main` unless acting as the designated integration agent.

## 6. Required task header

Before coding, each agent must identify:

- Agent ID and role
- Assigned branch
- Owned paths
- Read-only dependency paths
- Required inputs/contracts
- Expected outputs
- Acceptance tests

If owned paths overlap with another active agent, the coordinator must resolve ownership before coding.

## 7. Definition of Done for any task

A task is complete only when all are true:

1. implementation matches the normative document;
2. changed code builds/typechecks;
3. required unit/contract/integration tests pass;
4. loading, empty, success, degraded and error states are handled where applicable;
5. no real secret appears in tracked files;
6. no unrelated file is modified;
7. documentation is updated if a contract or behavior changed;
8. the agent reports exact files changed and tests run;
9. the integration agent can reproduce the result from GitHub.

## 8. Git discipline

- `main` stays demo-capable.
- Implementation agents work on short-lived branches defined in `docs/06_GIT_INTEGRATION_RULES.md`.
- Pull latest `main` before starting and before handoff.
- Commit messages must describe actual scope.
- Do not rewrite other agents' work to resolve conflicts by convenience; escalate contract conflicts.

## 9. External services

External service adapters must:

- live behind an explicit adapter/service boundary;
- use environment variables for credentials;
- time out and fail safely;
- return typed/validated results;
- log correlation IDs without logging secrets;
- expose degraded-state behavior;
- have at least one testable mock or deterministic fixture for local integration testing.

## 10. AI-specific rule

Model text is never treated as trusted executable state. Gemini/other model responses used by backend logic must be parsed into a declared schema, validated, bounded, persisted with provenance, and separated from human approval state.

## 11. UI-specific rule

The UI must not look like a generic collection of cards. Every screen must communicate one operational question. Motion is allowed only to communicate state, hierarchy, continuity, causality, live change or focus. Accessibility and reduced-motion behavior are required.

## 12. Blocker protocol

When blocked, report exactly:

```text
BLOCKER_ID:
Agent:
File/Subsystem:
Expected contract:
Observed ambiguity/conflict:
Work that can continue safely:
Decision required:
```

Do not guess through a blocker that changes shared behavior.
