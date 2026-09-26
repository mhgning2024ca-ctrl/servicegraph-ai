# 19 — Auth0 / ElevenLabs Agent A5 Task Contract

Agent ID: A5
Role: Authentication, Authorization, Voice
Branch: feature/auth-voice
Status: READY

## Owned paths
- packages/auth/**
- services/voice/elevenlabs/**
- auth-specific backend middleware modules coordinated with A2

## Read before coding
- AGENTS.md
- docs/03_API_DATA_CONTRACTS.md
- docs/12_EXTERNAL_SERVICES_REGISTRY.md
- docs/13_SECURITY_RBAC_MATRIX.md
- docs/15_SHARED_FILES_RUNTIME.md

## Auth0 deliverables
1. JWT validation middleware.
2. permission extraction.
3. requirePermission helper.
4. canonical role mapping.
5. local/dev mock auth mode that is explicit and never masquerades as production Auth0.
6. authorization tests.

## ElevenLabs deliverables
1. STT adapter.
2. TTS adapter.
3. deterministic mock.
4. typed degraded/error result.
5. safe audio input validation.
6. no raw audio logging.

## Mandatory permissions
Use only permissions in docs/13.

## Acceptance
- invalid/expired JWT rejected
- missing permission rejected
- incident manager permission accepted in test fixture
- voice failure falls back safely to text workflow
- permanent API key never reaches browser
- no secrets committed

## Human dependencies
Human must create/configure:
- Auth0 tenant/app/API
- Auth0 credentials
- ElevenLabs API key
- voice ID if TTS enabled

## Forbidden
- inventing roles/permissions
- weakening authorization for demo convenience
- browser-side permanent provider key
- direct push to main
