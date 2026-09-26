# 01 — System Architecture

Version: 0.1.0
Status: NORMATIVE
Depends on: `00_MASTER_SPEC.md`

## 1. Architectural objective

ServiceGraph AI uses one application architecture with two user experiences:

- citizen/customer mobile-first PWA;
- operations/NOC desktop command center.

Both surfaces consume the same backend contracts and persisted domain state.

The architecture prioritizes:

- clear module ownership for parallel agents;
- typed contracts;
- real-time operational feedback;
- deterministic demo reproducibility;
- safe AI boundaries;
- deployability on a single Vultr environment without preventing future scale-out.

## 2. Canonical technology choices

### Application runtime

- TypeScript end to end.
- Node.js LTS runtime compatible with all selected dependencies.
- Package manager: `pnpm` with workspace support.

### Web

- Next.js App Router.
- React.
- TypeScript strict mode.
- Tailwind CSS.
- accessible headless primitives (Radix/shadcn-compatible component patterns).
- Motion library only for meaningful state transitions.
- TanStack Query for server-state fetching/cache where useful.
- IndexedDB through a small typed wrapper for offline report queue.
- service worker/PWA manifest.

### API

- Fastify.
- Zod for runtime validation and shared schemas.
- OpenAPI generation from declared API schemas where feasible.
- PostgreSQL driver with explicit transaction boundaries.
- Server-Sent Events (SSE) for operational live updates in MVP.

### Data

- TigerData/PostgreSQL as primary database target.
- SQL migrations committed to repository.
- time-series telemetry stored in hypertable-compatible schema when available.
- relational incident/workflow state stored in PostgreSQL tables.

### Auth

- Auth0 OIDC/OAuth2.
- JWT validation server-side.
- RBAC permissions enforced in API hooks/middleware and domain service checks.

### Infrastructure

- Docker containers.
- Docker Compose for local/integration and hackathon deployment topology.
- Vultr primary demo host.
- Caddy or equivalent lightweight reverse proxy/TLS layer; selected deployment file becomes canonical once implementation begins.

## 3. Repository architecture

```text
servicegraph-ai/
├── AGENTS.md
├── README.md
├── .gitignore
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── docker-compose.yml
│
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── (public)/
│   │   │   ├── (citizen)/
│   │   │   └── (ops)/
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   └── public/
│   │
│   └── api/
│       └── src/
│           ├── app/
│           ├── modules/
│           │   ├── reports/
│           │   ├── telemetry/
│           │   ├── incidents/
│           │   ├── correlation/
│           │   ├── blast-radius/
│           │   ├── remediation/
│           │   ├── communications/
│           │   └── audit/
│           ├── auth/
│           ├── integrations/
│           ├── realtime/
│           └── shared/
│
├── packages/
│   ├── contracts/
│   │   ├── src/domain/
│   │   ├── src/api/
│   │   ├── src/events/
│   │   └── src/index.ts
│   ├── ui/
│   └── config/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   ├── demo-scenarios/
│   └── README.md
│
├── services/
│   ├── ai/
│   │   ├── gemini/
│   │   └── schemas/
│   ├── voice/
│   │   └── elevenlabs/
│   ├── memory/
│   │   └── backboard/
│   └── network-simulator/
│
├── infrastructure/
│   ├── docker/
│   ├── vultr/
│   └── reverse-proxy/
│
├── docs/
└── tests/
    ├── contract/
    ├── integration/
    ├── e2e/
    └── fixtures/
```

Agents may not invent a parallel alternative top-level architecture.

## 4. Runtime topology

```text
                    Internet
                       │
                 TLS / Reverse proxy
                       │
           ┌───────────┴───────────┐
           │                       │
       Next.js Web             Fastify API
           │                       │
           │                 ┌─────┼───────────────┐
           │                 │     │               │
           │              Auth0  Integrations   SSE stream
           │                       │
           │            ┌──────────┼───────────┐
           │            │          │           │
           │          Gemini   ElevenLabs   Backboard
           │
           └───────────────────────┐
                                   │
                         TigerData/PostgreSQL
                                   │
                         Network Simulator
```

The simulator is a backend service/module, not a fake front-end animation.

## 5. Request/report flow

### 5.1 Citizen text report

```text
PWA form
  ↓
client validation
  ↓
POST /v1/reports
  ↓
idempotency check
  ↓
server validation
  ↓
persist raw report
  ↓
classification pipeline
  ↓
persist structured symptoms
  ↓
correlation pipeline
  ↓
incident create/update
  ↓
SSE event
  ↓
ops dashboard updates
```

### 5.2 Offline report

```text
PWA detects submission failure/offline
  ↓
generate stable client report ID + idempotency key
  ↓
persist encrypted-by-platform IndexedDB record (no secret credentials)
  ↓
show QUEUED state
  ↓
connectivity returns
  ↓
background/foreground retry
  ↓
POST /v1/reports with same idempotency key
  ↓
server accepts once only
  ↓
local queue marks SENT
```

Do not promise background synchronization capabilities unsupported by the target browser; foreground retry is required fallback.

## 6. Telemetry flow

```text
scenario controller / simulator
      ↓
telemetry sample generator
      ↓
POST/internal ingest boundary
      ↓
validation + normalization
      ↓
TigerData telemetry storage
      ↓
threshold/rule evaluation
      ↓
correlation engine
      ↓
incident evidence
      ↓
SSE operational event
```

Telemetry schema must remain identical whether data is simulator-produced or future real-source-produced after normalization.

## 7. Correlation architecture

Correlation is hybrid and explainable.

### Deterministic signals

At minimum:

- time proximity;
- service identity;
- geographic proximity/area membership when available;
- network node/service topology relationship;
- telemetry threshold breach overlap;
- structured symptom similarity.

### AI augmentation

Gemini may:

- normalize language;
- identify symptom semantics;
- rank hypotheses;
- explain evidence combinations.

Gemini MUST NOT be the sole source of whether two records are linked. The application stores deterministic evidence inputs separately.

## 8. Incident graph

The incident graph shown in UI is derived from real persisted relationships, not hard-coded diagram data.

Canonical node categories:

- customer report;
- service;
- area;
- infrastructure node;
- telemetry anomaly;
- root-cause hypothesis;
- remediation proposal.

Canonical edge examples:

- `REPORT_AFFECTS_SERVICE`
- `REPORT_LOCATED_IN_AREA`
- `SERVICE_DEPENDS_ON_NODE`
- `TELEMETRY_OBSERVED_ON_NODE`
- `EVIDENCE_SUPPORTS_HYPOTHESIS`
- `PROPOSAL_TARGETS_NODE`

MVP may compute graph response from relational tables rather than introduce a graph database.

## 9. AI orchestration boundary

```text
Domain service
   ↓
build bounded evidence packet
   ↓
AI adapter
   ↓
Gemini API
   ↓
structured response
   ↓
Zod validation
   ├── invalid → explicit AI_ERROR/degraded state
   ↓
persist result + provenance
   ↓
domain decides permitted next state
```

Raw model prose never mutates incident/remediation state directly.

## 10. Remediation architecture

### Proposal

Generated/assembled proposal includes:

- immutable proposal ID/version;
- incident ID;
- target resource;
- action type;
- parameters;
- rationale;
- expected impact;
- risk level;
- evidence IDs;
- generated-by metadata.

### Approval

Approval endpoint verifies:

- authenticated subject;
- required permission;
- exact proposal version;
- proposal still pending;
- incident state allows approval.

### Execution

MVP executor calls the network simulator.

Execution must be idempotent. Repeating the same execution request cannot apply the action twice.

### Verification

Verification is based on telemetry after the execution timestamp and configured thresholds. An AI narrative may summarize the result but does not decide the numeric threshold pass/fail.

## 11. Real-time transport

MVP standard: SSE from API to operations web.

Minimum event types:

- `report.created`
- `report.correlated`
- `telemetry.anomaly`
- `incident.created`
- `incident.updated`
- `hypothesis.created`
- `remediation.proposed`
- `remediation.approved`
- `remediation.executing`
- `verification.updated`
- `incident.resolved`
- `communication.created`
- `integration.degraded`

Event envelopes are defined in `03_API_DATA_CONTRACTS.md`.

## 12. Observability

Every API request receives/propagates a correlation ID.

Structured logs include:

- timestamp;
- level;
- service/module;
- correlation ID;
- actor subject where appropriate;
- incident/report ID when relevant;
- event/action type;
- duration;
- outcome.

Never log:

- API keys;
- authorization headers;
- full sensitive tokens;
- private raw audio payloads unless explicitly required and documented.

## 13. Failure boundaries

### Gemini unavailable

- report persists;
- deterministic classification/correlation can continue where available;
- AI panels show unavailable/retry state;
- no fabricated hypothesis.

### ElevenLabs unavailable

- text report remains available;
- voice path reports failure and lets user type;
- no fake transcript.

### Backboard unavailable

- incident workflow continues;
- historical-memory card shows unavailable;
- no claim of Backboard result.

### Auth0 unavailable

- public read/report capability may remain where intentionally unauthenticated;
- protected ops/remediation actions fail closed.

### TigerData/PostgreSQL unavailable

- API health degrades;
- state-changing operations fail with explicit service-unavailable response;
- frontend shows system degradation.

## 14. Environment boundaries

Environments use identical application code:

- local developer/integration;
- optional VP4 staging/backup if used;
- Vultr primary demo.

Only configuration differs through environment variables and deployment descriptors. No Vultr-specific functional fork is allowed.

## 15. Architecture acceptance tests

Architecture is considered correctly implemented only when:

- shared contracts compile/import in web/API;
- web can run against contract-compliant mock data before backend readiness;
- API can run contract tests independently of web;
- simulator can create deterministic telemetry scenario;
- data survives API restart;
- SSE can deliver at least incident/report/remediation lifecycle events;
- unauthorized approval is rejected server-side;
- approved simulator action produces verifiable telemetry change;
- mobile report queue avoids duplicate report creation.
