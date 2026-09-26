# 00 — ServiceGraph AI Master Specification

Version: 0.1.0
Status: NORMATIVE / EXECUTION BASELINE
Date: 2026-09-26
Product: **ServiceGraph AI**
Tagline: **From complaint to root cause to safe resolution.**

## 1. Purpose

ServiceGraph AI is an AI-assisted service-operations platform for telecommunications, utilities and public-service operators. It correlates human complaints with live infrastructure telemetry so that many apparently independent reports can be recognized as symptoms of a smaller number of technical incidents.

The platform must demonstrate a complete operational loop, not a chatbot and not a static dashboard.

### Canonical loop

```text
citizen/customer report + network telemetry
                 ↓
normalization and event ingestion
                 ↓
evidence correlation
                 ↓
incident creation/update
                 ↓
probable root cause + confidence + evidence
                 ↓
blast-radius estimation and prioritization
                 ↓
recommended remediation
                 ↓
human authorization
                 ↓
controlled simulator/action
                 ↓
post-action telemetry verification
                 ↓
customer/citizen status communication
```

## 2. Problem statement

Service operators frequently receive many reports describing different symptoms: slow Internet, intermittent connectivity, unavailable application, call quality degradation, service outage, etc. Those reports can correspond to the same infrastructure problem. Treating each report independently increases triage cost, obscures the common cause and delays restoration.

ServiceGraph AI must answer five questions:

1. Are these reports related?
2. What technical evidence supports that relationship?
3. What is the most probable root cause?
4. Who/what is affected and how severe is the impact?
5. What action is recommended, who is allowed to approve it, and did service health improve afterward?

## 3. Product surfaces

### 3.1 Citizen/customer mobile-first PWA

Primary device: smartphone.

Required capabilities:

- check current service status;
- submit a report by text;
- submit a report by voice;
- capture location only after explicit permission and only when needed for geographic correlation;
- optionally authenticate and view personal report history;
- see whether a report has been correlated to a known incident;
- follow incident state;
- receive accessible bilingual status communication;
- mark “I am affected too” on a known local incident;
- preserve a pending report locally if connectivity drops before transmission;
- automatically retry queued submissions when connectivity returns;
- visually distinguish queued, sent, correlated and resolved states.

### 3.2 Operations/NOC command center

Primary device: desktop/laptop; tablet must remain usable.

Required capabilities:

- live health overview;
- real-time incident queue;
- telemetry views;
- complaint/report stream;
- geographic/service impact map;
- incident causal/evidence graph;
- root-cause hypothesis with confidence and evidence;
- blast-radius metrics;
- prior-incident/runbook memory;
- remediation recommendation;
- human approval/rejection workflow;
- network simulator execution state;
- post-remediation verification;
- customer-communication preview and dispatch;
- audit trail.

## 4. User roles

| Role | Purpose | Minimum permissions |
|---|---|---|
| Public visitor | view public service status and submit eligible report | public read/report-create |
| Citizen/customer | authenticated end user | own reports, notifications, profile |
| Operator | investigate incidents | operational read, annotate, request remediation |
| Incident manager | coordinate incident | operator + change incident severity/status + approve eligible remediation |
| Administrator | system administration | role/config/admin operations |

Authorization is enforced server-side. Hiding a UI button is not authorization.

## 5. Core domain objects

The minimum canonical domain is:

- `Service`
- `InfrastructureNode`
- `TelemetryEvent`
- `CustomerReport`
- `Incident`
- `IncidentEvidence`
- `IncidentCorrelation`
- `RootCauseHypothesis`
- `BlastRadiusSnapshot`
- `RemediationProposal`
- `ApprovalDecision`
- `RemediationExecution`
- `VerificationSnapshot`
- `CustomerCommunication`
- `AuditEvent`

Exact fields and states are defined in `03_API_DATA_CONTRACTS.md`.

## 6. Sponsor/integration responsibilities

### Gemini
Real responsibility:

- classify free-text/transcribed reports into structured symptoms;
- summarize clusters;
- reason over bounded telemetry/evidence context;
- produce structured root-cause hypotheses;
- produce remediation recommendations with explicit assumptions;
- generate operator/citizen summaries.

Gemini MUST NOT directly execute a remediation.

### TigerData / PostgreSQL
Real responsibility:

- authoritative event/telemetry persistence;
- time-series queries;
- rolling windows and incident evidence retrieval;
- operational analytics;
- incident history.

### Auth0
Real responsibility:

- operator/admin authentication;
- citizen authentication where applicable;
- RBAC/permissions;
- protect approval and administrative actions.

### ElevenLabs
Real responsibility:

- voice-based complaint intake and/or speech transcription where supported by selected API;
- accessible voice playback of service updates;
- bilingual communication path where implementation credentials/features support it.

Do not claim a capability not actually used in code/demo.

### Backboard
Real responsibility:

- persistent operational memory for prior incidents/runbooks/contextual recall;
- retrieval of relevant historical patterns for current incident investigation.

If unavailable during development, the adapter remains explicit and UI marks the integration unavailable; PostgreSQL history is not falsely labeled as Backboard.

### Vultr
Real responsibility:

- primary demo runtime;
- host API/web/supporting services defined by deployment architecture;
- provide infrastructure visible in deployment documentation/evidence.

### Ciena / telecom domain
Real responsibility:

- product problem, topology/telemetry model and network-operations context;
- do not claim direct Ciena device/API control unless a real authorized Ciena interface is implemented.

### CGI / utilities/public-service domain
Real responsibility:

- operational/customer-service value framing;
- measurable triage/restoration/duplicate-reduction metrics;
- governance and human-accountability design.

## 7. MVP scenario

The canonical demo scenario MUST be reproducible.

### Initial state

- simulated network has multiple nodes and services;
- `NODE-17` begins degrading;
- packet loss and latency rise over a short timeline;
- several customer reports arrive with different wording;
- one report is submitted from the mobile PWA, preferably voice.

### Expected system behavior

1. telemetry is ingested;
2. reports are normalized;
3. correlation engine finds spatial/service/time overlap;
4. incident is created or updated;
5. Gemini receives bounded evidence context;
6. structured hypothesis identifies `NODE-17` (or configured scenario target) as probable cause;
7. command center displays confidence and evidence, not only a conclusion;
8. blast radius is calculated;
9. prior incident/runbook context is retrieved;
10. remediation proposal is generated;
11. approval is required from an authorized human;
12. simulator applies the approved action;
13. new telemetry demonstrates recovery;
14. incident state advances only after verification rules pass;
15. affected users receive a status update;
16. audit trail records every material step.

## 8. Functional requirements

### FR-001 Report ingestion
System accepts a customer report with at minimum channel, timestamp, free-text/transcript and optional geographic/service context.

### FR-002 Voice intake
Mobile UI provides a voice-report path. The backend stores transcript/provenance and never stores a fabricated transcript as real.

### FR-003 Telemetry ingestion
System accepts deterministic simulated telemetry through the same normalization boundary used by the rest of the application.

### FR-004 Correlation
System computes correlation signals across time window, geography, service, topology and symptom classification. AI may augment but must not be the only opaque correlation mechanism.

### FR-005 Incident lifecycle
System groups related evidence under an incident with explicit state transitions.

### FR-006 Root-cause hypothesis
System stores one or more hypotheses with confidence, supporting evidence references, model provenance and timestamp.

### FR-007 Blast radius
System estimates affected users/services/areas from topology and report/telemetry data.

### FR-008 Remediation proposal
System creates a structured proposal containing action type, target, rationale, risk, expected effect and evidence references.

### FR-009 Human authorization
No remediation execution occurs without a permitted actor approving the exact proposal version.

### FR-010 Controlled execution
MVP executes against the deterministic network simulator/digital twin and labels it accordingly.

### FR-011 Verification
System compares post-action telemetry against thresholds and records whether recovery criteria are met.

### FR-012 Communication
System generates a user-facing update grounded in verified incident state; delivery channel state is visible.

### FR-013 Live operations
Command center receives live/near-live updates via SSE or declared real-time transport.

### FR-014 Offline-capable mobile reporting
Unsent mobile reports can be queued locally and retried; duplicate submission is prevented via idempotency key.

### FR-015 Auditability
Material state changes, approvals, external calls and failures create audit events with correlation IDs.

## 9. Incident state machine

Canonical states:

```text
DETECTED
  ↓
INVESTIGATING
  ↓
CONFIRMED
  ↓
REMEDIATION_PROPOSED
  ↓
AWAITING_APPROVAL
  ├──→ REJECTED
  ↓
REMEDIATING
  ↓
VERIFYING
  ├──→ INVESTIGATING (verification failed)
  ↓
RESOLVED
```

`CLOSED` may follow `RESOLVED` for administrative closure but is not required for the demo.

Agents MUST NOT introduce alternative spellings or hidden extra states without updating contracts first.

## 10. Quality requirements

### Performance targets for demo environment

- public page usable on mobile under normal 4G/Wi-Fi conditions;
- interactive skeleton appears promptly while server data loads;
- API health endpoint target p95 under 300 ms excluding external AI/service latency;
- non-AI operational reads target p95 under 500 ms in demo dataset;
- live UI update target within 2 seconds of backend event creation;
- AI/external operations display explicit progress and timeout states.

These are engineering targets, not contractual service-level agreements.

### Accessibility

- keyboard-navigable operations UI;
- semantic labels and focus states;
- contrast consistent with WCAG AA target;
- `prefers-reduced-motion` respected;
- status not conveyed by color alone;
- mobile controls sized for touch.

### Reliability

- external API failure cannot crash the entire page;
- retry is bounded;
- idempotency for report creation and remediation execution;
- database migrations are repeatable;
- no destructive demo reset without explicit command.

## 11. Modern UX rule

“Modern” means intentional, responsive, accessible and operationally legible — not visual noise.

Required characteristics:

- responsive layout with mobile-first citizen flow;
- desktop command-center information architecture;
- skeleton states rather than blocking blank screens;
- streaming/live state indicators where data is live;
- optimistic UI only where rollback is safe;
- command palette or fast navigation for operator workflow if time permits after core flow;
- contextual side panels/drawers rather than uncontrolled modal proliferation;
- evidence-first AI cards with confidence, source/time context and expandable detail;
- restrained micro-interactions tied to state;
- consistent design tokens and component variants;
- empty/error/degraded states designed as first-class screens.

## 12. Data truthfulness

Every displayed operational datum must be one of:

- live external data;
- persisted application data;
- deterministic simulator data explicitly labeled in developer/demo context;
- fixture/demo seed data explicitly controlled by the scenario.

The product must never present random placeholder numbers as if they were real telemetry.

## 13. GitHub and secrets

GitHub must expose the complete project necessary to understand and reproduce architecture and integrations. Real secret values are the only excluded configuration data.

Required repository files:

- source code;
- migrations;
- tests;
- `README.md`;
- `AGENTS.md`;
- `docs/*`;
- `.env.example`;
- Docker/deployment definitions;
- demo seed/simulator definitions;
- integration adapters.

Real `.env`, API keys and private keys are excluded.

## 14. Scope exclusions for MVP

Unless separately approved, do not implement:

- real carrier network device control;
- blockchain settlement;
- native iOS/Android codebase separate from the PWA;
- hardware sensors;
- autonomous remediation without human approval;
- large-scale ML model training;
- arbitrary user-created automation workflows;
- full ITSM replacement.

These exclusions protect execution focus; they do not reduce the depth of the implemented operational loop.

## 15. Acceptance baseline

The MVP is not accepted unless a reviewer can perform this end-to-end flow from a clean documented setup:

1. open citizen mobile UI;
2. create a report;
3. observe report arrival in operations UI;
4. trigger/observe telemetry degradation;
5. observe correlation into an incident;
6. inspect evidence and root-cause hypothesis;
7. inspect impact/blast radius;
8. create/receive remediation proposal;
9. attempt unauthorized approval and confirm denial;
10. approve with authorized user;
11. observe simulator action;
12. observe telemetry recovery/verification;
13. observe incident resolution and communication;
14. inspect audit trail.

## 16. Change control

Any change to canonical states, routes, shared fields, permissions, architecture boundaries or integration responsibilities requires:

1. documentation update;
2. contract update;
3. decision-log entry;
4. notification to agents owning affected paths;
5. regression tests before merge.
