# 13 — Security, Roles & Route Authorization Matrix

Version: 0.1.0
Status: NORMATIVE

## Roles
PUBLIC
CITIZEN
OPERATOR
INCIDENT_MANAGER
ADMINISTRATOR

## Role hierarchy
Hierarchy is convenience only. Backend checks explicit permissions.

## Permission assignment

PUBLIC:
- create eligible public report
- read public incident/status information

CITIZEN:
- reports:read:own

OPERATOR:
- reports:read:any
- incidents:read
- incidents:analyze
- remediation:propose

INCIDENT_MANAGER:
- all OPERATOR permissions
- incidents:update
- remediation:approve
- remediation:execute
- incidents:verify
- communications:create
- simulator:control

ADMINISTRATOR:
- all operational permissions
- audit:read
- admin:manage

## Route authorization

POST /v1/reports
- public allowed
- rate limited
- idempotency key required

GET /v1/reports/:id
- authenticated owner OR explicit secure receipt access

POST /v1/incidents/:id/affected-confirmations
- public/citizen allowed
- rate limited

GET /v1/incidents
- incidents:read

GET /v1/incidents/:id
- incidents:read

GET /v1/incidents/:id/evidence
- incidents:read

GET /v1/incidents/:id/graph
- incidents:read

POST /v1/incidents/:id/analyze
- incidents:analyze

POST /v1/incidents/:id/remediation-proposals
- remediation:propose

POST /v1/remediation-proposals/:proposalId/decision
- remediation:approve

POST /v1/remediation-proposals/:proposalId/execute
- remediation:execute

POST /v1/incidents/:id/verify
- incidents:verify

POST /v1/incidents/:id/communications
- communications:create

POST /v1/telemetry
- internal/demo credential OR simulator-controlled trusted path

POST /v1/simulator/scenarios/:scenarioKey/start
- simulator:control

GET /v1/events/stream
- incidents:read

GET /v1/health/live
- public

GET /v1/health/ready
- public safe output only

GET /v1/health/integrations
- authenticated operations user in final deployment; may be public-safe in local dev only

## Public endpoint protection

Public mutation endpoints require:
- request size limit
- input validation
- rate limit
- correlation ID
- safe error response

Recommended demo defaults:
- POST /v1/reports: 20 requests / 10 minutes / IP
- affected-confirmations: 30 requests / 10 minutes / IP

These are hackathon defaults and may be tuned centrally.

## CORS

Production/demo:
allow only configured public web origin(s) from environment.

No wildcard CORS with credentialed requests.

Environment:
`CORS_ALLOWED_ORIGINS`

## Security headers

Reverse proxy/web should emit appropriate:
- HSTS after HTTPS is stable
- X-Content-Type-Options
- Referrer-Policy
- Content-Security-Policy where compatible with required providers
- frame-ancestors / anti-clickjacking policy

## Secret rule

No provider secret, database credential, private key or Auth0 client secret may enter:
- client JavaScript
- committed source
- logs
- screenshots
- Devpost public text
