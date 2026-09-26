# 04 — AI & Integration Standard

Version: 0.1.0  
Status: NORMATIVE

## 1. Purpose

AI is used to accelerate understanding and decision support. It must never become an opaque source of operational truth or an autonomous privileged actor.

The canonical split is:

```text
deterministic evidence + validated data
            ↓
bounded AI reasoning
            ↓
validated structured output
            ↓
domain rules + human authorization
            ↓
controlled action
```

## 2. Gemini responsibilities

Gemini may perform:

- complaint/symptom classification;
- cluster summarization;
- root-cause hypothesis ranking over a bounded evidence packet;
- rationale generation;
- remediation recommendation generation;
- operator summary;
- citizen/public communication drafting.

Gemini may NOT:

- mutate incident state directly;
- approve remediation;
- execute remediation;
- invent telemetry;
- create evidence IDs that do not exist;
- claim successful recovery;
- override deterministic verification.

## 3. Evidence packet

Every root-cause request must contain only declared structured context.

Canonical packet:

```ts
{
  incidentId: string;
  incidentStatus: IncidentStatus;
  services: Service[];
  candidateNodes: InfrastructureNode[];
  reports: Array<{
    id: string;
    createdAt: string;
    text: string;
    symptomCodes: string[];
    areaCode: string | null;
    serviceId: string | null;
  }>;
  telemetryAnomalies: Array<{
    id: string;
    nodeId: string;
    metric: string;
    value: number;
    threshold: number;
    observedAt: string;
  }>;
  topologyEvidence: Array<{
    serviceId: string;
    nodeId: string;
    relation: string;
  }>;
  historicalContext: Array<{
    source: "BACKBOARD" | "POSTGRES_HISTORY";
    referenceId: string;
    summary: string;
  }>;
}
```

The backend chooses and bounds the packet. The model is never given unrestricted database access.

## 4. Structured Gemini output

Root-cause response MUST validate to:

```ts
{
  label: string;
  targetNodeId: string | null;
  confidence: number;            // 0..1
  rationale: string;
  evidenceIds: string[];
  assumptions: string[];
  alternativeHypotheses: Array<{
    label: string;
    targetNodeId: string | null;
    confidence: number;
  }>;
}
```

Validation rules:
- all evidence IDs must exist in the request packet;
- target node must exist in candidate nodes or be null;
- confidence must be bounded;
- no execution instruction is treated as authorization;
- invalid output creates explicit degraded state and does not advance incident lifecycle.

## 5. Deterministic correlation before AI

The correlation engine calculates explainable features before Gemini:

- time-window overlap;
- same service;
- same area;
- topology dependency overlap;
- telemetry anomaly overlap;
- symptom-code similarity.

The model receives these facts and may explain/rank them. It is not the sole clustering mechanism.

## 6. Remediation recommendation

Gemini recommendation schema:

```ts
{
  actionType: "REROUTE_TRAFFIC" | "RESTART_SIMULATED_NODE" | "THROTTLE_LOAD" | "NO_ACTION";
  targetNodeId: string | null;
  parameters: Record<string, string | number | boolean>;
  rationale: string;
  expectedEffect: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  evidenceIds: string[];
  assumptions: string[];
}
```

The backend converts a validated recommendation into a versioned `RemediationProposal`. It does NOT execute it.

## 7. Prompt/version governance

Prompt templates live in source control under `services/ai/prompts/`.

Each persisted AI result stores:
- provider;
- model name;
- prompt version;
- request timestamp;
- response timestamp;
- validation outcome;
- evidence references;
- correlation ID.

Never store API keys or full authorization headers.

## 8. Gemini failure behavior

If Gemini times out/fails:
- preserve report/incident data;
- deterministic correlation continues;
- UI marks AI analysis as unavailable;
- operator can retry;
- no fabricated result;
- no lifecycle transition that depends solely on absent AI output.

Default request timeout target: 15 seconds. Retries: maximum 1 automatic retry for transient failure.

## 9. ElevenLabs responsibilities

Primary use cases:

1. citizen voice report transcription where selected ElevenLabs capability/account supports it;
2. generated voice playback of verified customer/public service updates.

Rules:
- voice transcript retains provenance;
- failed transcription never becomes fake text;
- typed-report fallback is always available;
- TTS is generated only from approved/verified communication text;
- UI visibly distinguishes recording, uploading, transcribing, ready and failed states;
- no raw audio is logged.

Adapter boundary: `services/elevenlabs/`.

## 10. Backboard responsibilities

Backboard is the preferred persistent AI-memory integration for:
- prior incident summaries;
- runbook retrieval;
- repeated pattern/context recall.

Rules:
- returned memory must include reference/provenance usable in UI;
- current telemetry always outranks stale memory;
- historical memory is advisory evidence, not current truth;
- if unavailable, integration state is explicit;
- PostgreSQL history may support local development, but must never be mislabeled as Backboard.

Adapter boundary: `services/backboard/`.

## 11. Auth0 for AI/action boundary

Any action that changes operational state requires server-side authorization.

AI may propose:
- action;
- target;
- parameters;
- reason.

Human actor must approve exact proposal version.

Required audit chain:

```text
AI recommendation
→ proposal ID/version
→ authenticated actor
→ permission evaluation
→ approval/rejection
→ execution request
→ result
→ verification
```

## 12. AI UI requirements

AI cards must show:
- model/provider label;
- generated/analyzed timestamp;
- confidence;
- supporting evidence count;
- concise rationale;
- expandable evidence;
- assumptions if non-empty;
- degraded/error state.

Forbidden:
- “AI knows” language;
- unexplained certainty;
- hidden evidence;
- animated fake analysis progress unrelated to a real request.

## 13. Integration adapter contract

Every external provider adapter exposes:

```ts
type IntegrationResult<T> =
  | { ok: true; data: T; provider: string; durationMs: number }
  | { ok: false; errorCode: string; retryable: boolean; provider: string; durationMs: number };
```

Adapters must:
- use environment variables;
- time out;
- redact secrets;
- expose health state;
- have a deterministic mock fixture;
- never throw raw provider payloads into UI responses.

## 14. Acceptance

AI/integrations are accepted only when:
- structured Gemini result validation exists;
- invalid model output is demonstrably rejected;
- AI cannot call simulator executor directly;
- operator approval is enforced server-side;
- ElevenLabs failure leaves text reporting usable;
- Backboard failure leaves current incident workflow usable;
- UI exposes evidence/confidence and integration state.
