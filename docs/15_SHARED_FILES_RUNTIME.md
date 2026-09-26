# 15 — Shared Files, Packages & Runtime Configuration

Version: 0.1.0
Status: NORMATIVE

## Root files

Required:
- package.json
- pnpm-workspace.yaml
- pnpm-lock.yaml
- .gitignore
- .env.example
- docker-compose.yml
- README.md
- AGENTS.md

## Workspace packages

### packages/contracts
Canonical shared schemas.

Required files:
- src/domain/common.ts
- src/domain/report.ts
- src/domain/incident.ts
- src/domain/telemetry.ts
- src/domain/remediation.ts
- src/domain/communication.ts
- src/api/reports.ts
- src/api/incidents.ts
- src/api/remediation.ts
- src/api/simulator.ts
- src/events/envelope.ts
- src/index.ts

No frontend/backend agent may define competing public contract types elsewhere.

### packages/config
Shared non-secret constants only.

### packages/ui
Only reusable cross-screen UI primitives approved by frontend owner.

## Backend provider adapters

Canonical paths:
- services/ai/gemini/**
- services/voice/elevenlabs/**
- services/memory/backboard/**
- services/network-simulator/**

## Runtime environment

Required baseline:
- NODE_ENV
- PUBLIC_APP_URL
- API_BASE_URL
- DATABASE_URL
- CORS_ALLOWED_ORIGINS
- LOG_LEVEL
- SIMULATOR_ENABLED
- DEMO_SCENARIO_KEY

Gemini:
- GEMINI_API_KEY
- GEMINI_MODEL

ElevenLabs:
- ELEVENLABS_API_KEY
- ELEVENLABS_VOICE_ID
- ELEVENLABS_STT_MODEL
- ELEVENLABS_TTS_MODEL

Auth0:
- AUTH0_DOMAIN
- AUTH0_CLIENT_ID
- AUTH0_CLIENT_SECRET
- AUTH0_AUDIENCE
- AUTH0_SECRET
- AUTH0_BASE_URL

Backboard:
- BACKBOARD_API_KEY
- BACKBOARD_ASSISTANT_ID

## HTTP behavior

Default API request body limit:
1 MB JSON unless route explicitly needs multipart audio.

Public voice upload:
multipart route/provider adapter with explicit audio size/type validation.

Correlation ID:
accept valid incoming request correlation ID only if safe; otherwise generate UUID and return it in response.

## Idempotency

For required idempotent routes:
- key stored with request fingerprint and result
- same key + same fingerprint returns/replays original result where safe
- same key + different fingerprint returns 409 IDEMPOTENCY_CONFLICT
- demo retention target: 24 hours

## SSE

Endpoint:
GET /v1/events/stream

Rules:
- authenticated operations user
- heartbeat/comment at least every 20 seconds
- browser may reconnect automatically
- Last-Event-ID supported where implementation permits
- event IDs monotonic/unique enough for demo stream
- no telemetry sample flood; send lifecycle/anomaly events, not every raw sample

## Logging

Structured fields:
- timestamp
- level
- module
- correlationId
- actorSubject when applicable
- entityType
- entityId
- action/event
- durationMs
- outcome

Never log:
- authorization headers
- API keys
- passwords
- private SSH keys
- raw access tokens
- unneeded raw audio
