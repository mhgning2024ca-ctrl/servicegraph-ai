# 03 — API & Data Contracts

Version: 0.1.0  
Status: NORMATIVE / CONTRACT FREEZE CANDIDATE  
Applies to: `apps/web`, `apps/api`, `packages/contracts`, `packages/db`, simulator, tests

## 1. Contract rules

- API base path: `/v1`.
- JSON keys use `camelCase`.
- Database columns use `snake_case`.
- IDs are UUID strings unless explicitly declared otherwise.
- Timestamps are ISO-8601 UTC strings in API payloads and `timestamptz` in PostgreSQL.
- Confidence values are decimal numbers in `[0,1]`.
- Every state-changing request receives/propagates a `correlationId`.
- Every create/execute endpoint that can be retried requires an idempotency key.
- Shared request/response schemas MUST live in `packages/contracts` and be validated at runtime with Zod.
- Frontend mocks MUST import the same shared schemas/types used by the API.
- No agent may invent an additional public field, enum value, path, or state without updating this document first.

## 2. Canonical enums

### IncidentStatus

```text
DETECTED
INVESTIGATING
CONFIRMED
REMEDIATION_PROPOSED
AWAITING_APPROVAL
REJECTED
REMEDIATING
VERIFYING
RESOLVED
CLOSED
```

### Severity

```text
INFO
MINOR
MAJOR
CRITICAL
```

### ReportChannel

```text
WEB_TEXT
WEB_VOICE
PUBLIC_API
SIMULATOR
```

### ReportProcessingState

```text
RECEIVED
CLASSIFYING
CLASSIFIED
CORRELATED
NEEDS_REVIEW
FAILED
```

### InfrastructureNodeStatus

```text
HEALTHY
DEGRADED
CRITICAL
UNKNOWN
```

### RemediationRisk

```text
LOW
MEDIUM
HIGH
```

### ApprovalDecisionType

```text
APPROVE
REJECT
```

### IntegrationState

```text
AVAILABLE
DEGRADED
UNAVAILABLE
```

## 3. Canonical entities

### Service

Required fields:

```ts
{
  id: string;
  code: string;
  name: string;
  description: string | null;
  publicVisible: boolean;
  status: "HEALTHY" | "DEGRADED" | "CRITICAL" | "UNKNOWN";
}
```

### InfrastructureNode

```ts
{
  id: string;
  code: string;              // e.g. NODE-17
  name: string;
  type: "ROUTER" | "SWITCH" | "EDGE" | "ACCESS" | "SERVICE";
  status: InfrastructureNodeStatus;
  latitude: number | null;
  longitude: number | null;
  areaCode: string | null;
  metadata: Record<string, string | number | boolean>;
}
```

### TelemetrySample

```ts
{
  id: string;
  nodeId: string;
  observedAt: string;
  metric: "LATENCY_MS" | "PACKET_LOSS_PCT" | "ERROR_RATE" | "THROUGHPUT_MBPS" | "AVAILABILITY";
  value: number;
  unit: string;
  source: "SIMULATOR" | "EXTERNAL";
  scenarioId: string | null;
}
```

### CustomerReport

```ts
{
  id: string;
  clientReportId: string;
  createdAt: string;
  channel: ReportChannel;
  state: ReportProcessingState;
  text: string;
  transcript: string | null;
  audioAssetId: string | null;
  serviceId: string | null;
  areaCode: string | null;
  latitude: number | null;
  longitude: number | null;
  symptomCodes: string[];
  citizenId: string | null;
  correlatedIncidentId: string | null;
  sourceLanguage: string | null;
}
```

### IncidentSummary

```ts
{
  id: string;
  incidentNumber: string;     // e.g. INC-2048
  title: string;
  status: IncidentStatus;
  severity: Severity;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  resolvedAt: string | null;
  affectedUsersEstimate: number;
  affectedServiceIds: string[];
  affectedAreaCodes: string[];
  probableRootNodeId: string | null;
  rootCauseConfidence: number | null;
}
```

### IncidentEvidence

```ts
{
  id: string;
  incidentId: string;
  type: "CUSTOMER_REPORT" | "TELEMETRY_ANOMALY" | "TOPOLOGY" | "HISTORICAL_INCIDENT" | "OPERATOR_NOTE";
  sourceId: string;
  summary: string;
  observedAt: string;
  weight: number;
}
```

### RootCauseHypothesis

```ts
{
  id: string;
  incidentId: string;
  createdAt: string;
  label: string;
  targetNodeId: string | null;
  confidence: number;
  rationale: string;
  evidenceIds: string[];
  assumptions: string[];
  modelProvider: "GEMINI" | "RULE_ENGINE";
  modelName: string | null;
  promptVersion: string | null;
}
```

### BlastRadiusSnapshot

```ts
{
  id: string;
  incidentId: string;
  createdAt: string;
  affectedUsersEstimate: number;
  affectedServiceIds: string[];
  affectedAreaCodes: string[];
  affectedNodeIds: string[];
}
```

### RemediationProposal

```ts
{
  id: string;
  incidentId: string;
  version: number;
  createdAt: string;
  createdBy: "GEMINI" | "RULE_ENGINE" | "OPERATOR";
  actionType: "REROUTE_TRAFFIC" | "RESTART_SIMULATED_NODE" | "THROTTLE_LOAD" | "NO_ACTION";
  targetNodeId: string | null;
  parameters: Record<string, string | number | boolean>;
  rationale: string;
  expectedEffect: string;
  risk: RemediationRisk;
  evidenceIds: string[];
  state: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "EXECUTED" | "SUPERSEDED";
}
```

### ApprovalDecision

```ts
{
  id: string;
  proposalId: string;
  proposalVersion: number;
  decidedAt: string;
  decision: ApprovalDecisionType;
  actorSubject: string;
  actorRole: "INCIDENT_MANAGER" | "ADMINISTRATOR";
  comment: string | null;
}
```

### RemediationExecution

```ts
{
  id: string;
  proposalId: string;
  startedAt: string;
  completedAt: string | null;
  state: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  simulatorActionId: string | null;
  resultSummary: string | null;
}
```

### VerificationSnapshot

```ts
{
  id: string;
  incidentId: string;
  executionId: string;
  createdAt: string;
  windowStart: string;
  windowEnd: string;
  passed: boolean;
  checks: Array<{
    metric: string;
    before: number;
    after: number;
    threshold: number;
    passed: boolean;
  }>;
}
```

### CustomerCommunication

```ts
{
  id: string;
  incidentId: string;
  createdAt: string;
  audience: "AFFECTED_USERS" | "PUBLIC";
  language: "en" | "fr";
  text: string;
  voiceAssetId: string | null;
  state: "DRAFT" | "READY" | "SENT" | "FAILED";
}
```

## 4. Database baseline

Minimum tables:

- `services`
- `infrastructure_nodes`
- `service_node_dependencies`
- `telemetry_samples`
- `customer_reports`
- `incidents`
- `incident_reports`
- `incident_evidence`
- `root_cause_hypotheses`
- `blast_radius_snapshots`
- `remediation_proposals`
- `approval_decisions`
- `remediation_executions`
- `verification_snapshots`
- `customer_communications`
- `audit_events`
- `integration_health`

`telemetry_samples` is the canonical TigerData time-series table when TigerData is enabled.

## 5. Public/citizen API

### POST /v1/reports

Headers:
- `Idempotency-Key`: required

Request:

```json
{
  "clientReportId": "uuid",
  "channel": "WEB_TEXT",
  "text": "My internet has been cutting out for 20 minutes.",
  "serviceId": "uuid-or-null",
  "areaCode": "OTT-CENTRETOWN",
  "latitude": null,
  "longitude": null,
  "sourceLanguage": "en"
}
```

Response `201`:

```json
{
  "report": { "...CustomerReport": "canonical shape" },
  "receipt": {
    "reportId": "uuid",
    "receivedAt": "2026-09-26T06:00:00Z"
  }
}
```

Errors:
- `400 VALIDATION_ERROR`
- `409 IDEMPOTENCY_CONFLICT`
- `503 SERVICE_UNAVAILABLE`

### GET /v1/reports/:id

Public access only when a secure receipt token or authenticated owner policy allows it. Otherwise `401/403`.

### POST /v1/incidents/:id/affected-confirmations

Purpose: “I’m affected too”.

Request:

```json
{
  "serviceId": "uuid-or-null",
  "areaCode": "OTT-CENTRETOWN"
}
```

## 6. Operations API

All operations routes require authenticated Auth0 access token and server-side permission evaluation.

### GET /v1/incidents

Query:
- `status` optional
- `severity` optional
- `limit` default 50, max 100
- `cursor` optional

### GET /v1/incidents/:id

Response contains:
- `incident`
- latest `rootCauseHypothesis`
- latest `blastRadius`
- active/latest `remediationProposal`
- `integrationStates`

### GET /v1/incidents/:id/evidence

Returns canonical evidence records.

### GET /v1/incidents/:id/graph

Response:

```ts
{
  nodes: Array<{
    id: string;
    category: "REPORT" | "SERVICE" | "AREA" | "INFRASTRUCTURE_NODE" | "TELEMETRY_ANOMALY" | "HYPOTHESIS" | "REMEDIATION";
    label: string;
    status: string | null;
    metadata: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: "REPORT_AFFECTS_SERVICE" | "REPORT_LOCATED_IN_AREA" | "SERVICE_DEPENDS_ON_NODE" | "TELEMETRY_OBSERVED_ON_NODE" | "EVIDENCE_SUPPORTS_HYPOTHESIS" | "PROPOSAL_TARGETS_NODE";
  }>;
}
```

### POST /v1/incidents/:id/analyze

Permission: `incidents:analyze`.

Triggers bounded correlation/root-cause analysis. Returns `202` with operation ID.

### POST /v1/incidents/:id/remediation-proposals

Permission: `remediation:propose`.

Request must conform to `RemediationProposal` fields excluding server-generated IDs/timestamps/state.

### POST /v1/remediation-proposals/:proposalId/decision

Permission: `remediation:approve`.

Request:

```json
{
  "proposalVersion": 1,
  "decision": "APPROVE",
  "comment": "Approved for simulator execution."
}
```

Rules:
- proposal version MUST match current version;
- proposal MUST be in `PENDING_APPROVAL`;
- actor role MUST be Incident Manager or Administrator;
- approval MUST be audited;
- response MUST NOT imply execution has already succeeded.

### POST /v1/remediation-proposals/:proposalId/execute

Permission: `remediation:execute`.

Headers:
- `Idempotency-Key`: required

Preconditions:
- approved exact version;
- incident state permits execution;
- simulator/executor integration available.

### POST /v1/incidents/:id/verify

Permission: `incidents:verify`.

Verification is deterministic against telemetry thresholds.

### POST /v1/incidents/:id/communications

Permission: `communications:create`.

Creates text first. Voice asset generation is optional sub-operation when ElevenLabs is available.

## 7. Telemetry/simulator API

### POST /v1/telemetry

Protected internal/demo route. Accepts an array of canonical telemetry samples. Max batch size: 500.

### POST /v1/simulator/scenarios/:scenarioKey/start

Permission: `simulator:control`.

Canonical MVP scenario key:

`node17-degradation`

Request:

```json
{
  "speed": 1
}
```

### GET /v1/simulator/scenarios/:scenarioId

Returns scenario state and virtual timeline.

## 8. SSE API

### GET /v1/events/stream

Authenticated for operations UI.

Event envelope:

```ts
{
  id: string;
  type:
    | "report.created"
    | "report.correlated"
    | "telemetry.anomaly"
    | "incident.created"
    | "incident.updated"
    | "hypothesis.created"
    | "remediation.proposed"
    | "remediation.approved"
    | "remediation.executing"
    | "verification.updated"
    | "incident.resolved"
    | "communication.created"
    | "integration.degraded";
  occurredAt: string;
  correlationId: string;
  entityId: string | null;
  payload: Record<string, unknown>;
}
```

## 9. Error envelope

All non-2xx JSON errors:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable safe message.",
    "details": [],
    "correlationId": "uuid"
  }
}
```

Do not expose stack traces or secrets.

## 10. Contract acceptance

Contract layer is accepted only when:

- schemas compile and are imported by both web and API;
- mock fixtures validate against schemas;
- every public route has request/response schema;
- invalid enum values fail validation;
- API errors use the canonical envelope;
- frontend does not define competing local copies of shared domain types.
