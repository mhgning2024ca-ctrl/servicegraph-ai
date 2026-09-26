# 11 — Specification Completeness Audit

Version: 0.1.0
Status: NORMATIVE / GAP-CLOSURE
Date: 2026-09-26

## Purpose

This document exists because implementation agents are forbidden from inventing shared behavior. Therefore, architecture documents must distinguish between:
- frozen decisions;
- implementation-local choices that agents may make;
- unresolved shared decisions that must be fixed before dependent work proceeds.

The project is NOT considered implementation-complete merely because the high-level architecture is complete.

## Current completeness status

### Already defined sufficiently for parallel work
- product purpose and end-to-end operational loop
- canonical technology family
- repository architecture
- major user roles
- incident state machine
- core domain entities
- primary API base path
- public report creation
- incident query/analyze/remediation routes
- simulator start route
- SSE transport
- AI safety boundary
- Gemini structured-output principle
- ElevenLabs role
- Backboard role
- TigerData role
- Vultr deployment role
- frontend responsive/bilingual standard
- Git branch model and integration discipline

### Previously under-specified and now requiring explicit closure
1. physical database constraints, indexes and foreign keys
2. exact Auth0 permissions and role-to-permission matrix
3. exact external provider SDKs/endpoints/models
4. exact external-provider environment variable names
5. exact adapter file locations/interfaces
6. exact health/integration-state semantics
7. route-level authorization matrix
8. API timeout/retry rules
9. idempotency semantics and retention window
10. CORS/origin policy
11. rate limiting for public endpoints
12. SSE reconnect/heartbeat behavior
13. file naming for shared contracts
14. migration naming/order
15. seed/demo scenario identifiers
16. provider-degraded fallback behavior
17. observability/logging fields
18. final package dependency versions at lockfile time

## Rule for agents

An agent may make a local implementation choice only if it does NOT alter any of:
- public API contract
- database semantics
- security boundary
- role/permission behavior
- state machine
- external-provider responsibility
- shared file ownership
- frontend-visible product behavior
- deployment topology

Examples of permitted local choices:
- private helper function names
- internal test fixture layout
- local variable names
- non-public class/function decomposition
- exact CSS selector naming inside owned frontend paths

Examples requiring specification:
- adding a database column
- adding an API route
- changing a provider model
- changing an Auth0 permission
- changing a shared Zod schema
- adding a new incident state
- exposing a new public port
- changing retry semantics

## Completeness gate

A subsystem may begin implementation only when its contract document contains:
1. owned paths
2. inputs
3. outputs
4. shared types
5. failure behavior
6. security rules
7. environment variables
8. acceptance tests
9. integration dependency
10. blocker escalation rule

## Freeze policy

"Do not invent" does NOT mean "stop the project for every minor coding detail."

It means:
- shared/public/semantic decisions are frozen by documentation;
- private implementation details remain agent-owned;
- missing shared decisions are escalated and resolved centrally.

This distinction is mandatory for all agents.
