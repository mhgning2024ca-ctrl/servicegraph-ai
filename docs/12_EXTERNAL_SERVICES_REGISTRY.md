# 12 — External Services Registry & Integration Contracts

Version: 0.1.0
Status: NORMATIVE
Date: 2026-09-26

## 1. General rule

All external providers are accessed only from server-side code unless a provider-specific short-lived client token is explicitly supported and approved.

No permanent API key is exposed to browser code.

Every adapter returns the canonical IntegrationResult<T> defined in docs/04_AI_INTEGRATION_STANDARD.md.

Every provider has:
- one adapter boundary;
- environment variables;
- timeout;
- bounded retry policy;
- health state;
- deterministic mock/fixture;
- degraded UI behavior.

## 2. Gemini

### Purpose
- complaint classification
- incident cluster summary
- root-cause hypothesis
- remediation recommendation
- citizen/operator message drafting

### Official SDK
Package:
`@google/genai`

### Canonical model
Default:
`gemini-3.8-flash`

Environment override:
`GEMINI_MODEL`

If the account does not expose the canonical model, the coordinator may approve another currently available Gemini model. Agents must NOT silently substitute one.

### Environment
`GEMINI_API_KEY`
`GEMINI_MODEL`

### Adapter
`services/ai/gemini/client.ts`
`services/ai/gemini/root-cause.ts`
`services/ai/gemini/remediation.ts`
`services/ai/gemini/classification.ts`

### Output
Gemini outputs used by backend logic MUST be JSON/structured output validated with Zod.

### Timeout / retry
- timeout: 15 seconds
- automatic retry: maximum 1
- retry only transient network/5xx/rate-limit class errors when safe
- schema validation failure: no automatic infinite retry

### Failure
- deterministic correlation remains available
- incident persists
- UI shows AI unavailable/degraded
- no fake hypothesis is created

## 3. ElevenLabs

### Purpose
- speech-to-text for citizen voice reports
- text-to-speech for approved incident communication

### Official Node SDK
`@elevenlabs/elevenlabs-js`

### Speech-to-text
Endpoint:
`POST /v1/speech-to-text`

Canonical model:
`scribe_v2`

### Text-to-speech
Endpoint:
`POST /v1/text-to-speech/{voice_id}`

Canonical default model:
`eleven_multilingual_v2`

A different TTS model may be approved only if required by account availability or demo latency.

### Environment
`ELEVENLABS_API_KEY`
`ELEVENLABS_VOICE_ID`
`ELEVENLABS_STT_MODEL=scribe_v2`
`ELEVENLABS_TTS_MODEL=eleven_multilingual_v2`

### Adapter
`services/voice/elevenlabs/transcribe.ts`
`services/voice/elevenlabs/speak.ts`
`services/voice/elevenlabs/client.ts`

### Browser rule
Permanent ElevenLabs API key MUST NOT be sent to the browser.

### Failure
- voice report falls back to text
- TTS failure leaves approved text visible
- no fake transcript/audio success

## 4. Auth0

### Purpose
- authentication
- access tokens
- RBAC
- privileged action authorization

### Required API configuration
Auth0 custom API with:
- RBAC enabled
- "Add Permissions in the Access Token" enabled

### Canonical roles
- CITIZEN
- OPERATOR
- INCIDENT_MANAGER
- ADMINISTRATOR

### Canonical permissions
- `reports:read:own`
- `reports:read:any`
- `incidents:read`
- `incidents:analyze`
- `incidents:update`
- `remediation:propose`
- `remediation:approve`
- `remediation:execute`
- `incidents:verify`
- `communications:create`
- `audit:read`
- `simulator:control`
- `admin:manage`

### Environment
`AUTH0_DOMAIN`
`AUTH0_CLIENT_ID`
`AUTH0_CLIENT_SECRET`
`AUTH0_AUDIENCE`
`AUTH0_SECRET`
`AUTH0_BASE_URL`

### Server rule
Backend authorizes permissions from validated JWT claims.
Frontend hiding/disabling controls is never authorization.

## 5. TigerData / PostgreSQL

### Purpose
- primary operational relational storage
- time-series telemetry
- analytics windows
- incident evidence/history

### Connection
Standard PostgreSQL connection string:
`DATABASE_URL`

TLS/SSL required in deployed environment when managed Tiger Cloud requires it.

### Telemetry
`telemetry_samples` is implemented as a TigerData/Timescale hypertable.

Canonical timestamp column:
`observed_at timestamptz`

Recommended segmentation/filter dimension:
`node_id`

### Continuous aggregate
A one-minute telemetry aggregate SHOULD be created for:
- avg latency
- max packet loss
- avg error rate
- avg availability

This aggregate powers dashboard history where implemented.

### Adapter/access
`packages/db/**`
`database/migrations/**`

### Failure
State-changing API paths requiring persistence fail closed with service unavailable.
Frontend displays database/system degraded state.

## 6. Backboard

### Purpose
Persistent operational memory for:
- historical incident summaries
- runbook memory
- similar-incident retrieval

### Base API
`https://app.backboard.io/api`

### Authentication
Header:
`X-API-Key`

### Canonical pattern
Use one named assistant for ServiceGraph operational memory.

Environment:
`BACKBOARD_API_KEY`
`BACKBOARD_ASSISTANT_ID`

Optional project/session identifiers may be added only if the implemented SDK/API path requires them and documentation is updated first.

### Memory behavior
Preferred operational retrieval mode:
readonly retrieval for current incident analysis where possible.

Current telemetry and current DB evidence always outrank recalled memory.

### Adapter
`services/memory/backboard/client.ts`
`services/memory/backboard/search.ts`
`services/memory/backboard/store.ts`

### Failure
Incident workflow continues.
UI explicitly reports historical memory unavailable.

## 7. Vultr

### Purpose
Primary demo runtime.

### Human-owned actions
- create account
- accept credits/terms
- create cloud compute instance
- approve SSH key
- manage billing/account settings

### Application deployment
- Ubuntu LTS
- Docker Engine
- Docker Compose
- reverse proxy/TLS
- only ports 22, 80, 443 exposed unless explicitly approved

### Runtime
Canonical code remains identical to local/staging.
No Vultr-specific functional fork.

## 8. GoDaddy Registry

Only integrate if an eligible domain is actually registered/available for the hackathon prize.

DNS role:
A/AAAA/CNAME as required for the public Vultr deployment.

No GoDaddy SDK is required merely to qualify; usage must match contest requirements.

## 9. Ciena / CGI

Ciena and CGI are domain/challenge context unless an official API/resource is provided.

Do NOT fabricate:
- Ciena API integration
- Ciena device control
- CGI proprietary system integration

If official hackathon resources are later provided, they require a new decision-log entry before integration.

## 10. Provider health

Canonical health state:
- AVAILABLE
- DEGRADED
- UNAVAILABLE

Health endpoint:
`GET /v1/health/integrations`

Response must expose:
- provider
- state
- checkedAt
- safe reason code

Never expose secrets or raw credential errors.

## 11. Credential ownership

Human coordinator is responsible for creating/providing:
- GEMINI_API_KEY
- ELEVENLABS_API_KEY
- ELEVENLABS_VOICE_ID
- Auth0 tenant/application/API credentials
- DATABASE_URL
- BACKBOARD_API_KEY
- BACKBOARD_ASSISTANT_ID
- Vultr SSH/access details
- domain/DNS credentials

Agents must request missing credentials; never invent them.
