# 21 — Infrastructure Agent A8 Task Contract

Agent ID: A8
Role: Vultr / Docker / TLS / deployment
Branch: feature/infrastructure
Status: READY

## Owned paths
- infrastructure/**
- docker-compose deployment files coordinated with integration owner
- deployment scripts

## Read before coding
- AGENTS.md
- docs/01_SYSTEM_ARCHITECTURE.md
- docs/07_VULTR_DEPLOYMENT.md
- docs/12_EXTERNAL_SERVICES_REGISTRY.md
- docs/13_SECURITY_RBAC_MATRIX.md
- docs/15_SHARED_FILES_RUNTIME.md

## Mandatory deliverables
1. Dockerfiles for web/api when app build contracts exist.
2. docker-compose.yml integration.
3. Caddy/reverse proxy configuration.
4. Vultr bootstrap instructions/scripts.
5. health checks.
6. env-file template usage.
7. deploy procedure.
8. rollback procedure.
9. firewall checklist.
10. SSH hardening checklist.

## Human-required actions
- create Vultr instance
- add SSH key
- accept credits/terms
- DNS/domain changes
- provide secrets

## Acceptance
- clean Vultr host can clone/build/start
- ports limited to documented exposure
- web reachable via HTTPS when DNS available
- /v1/health/live and ready work
- no secrets in repo
- rollback documented/testable

## Forbidden
- app logic changes
- public DB exposure
- storing private key in repo
- direct push to main
