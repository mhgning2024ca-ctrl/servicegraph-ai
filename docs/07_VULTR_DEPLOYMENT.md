# 07 — Vultr Deployment Specification

Version: 0.1.0  
Status: NORMATIVE  
Primary demo runtime: Vultr

## 1. Deployment objective

Run one canonical application architecture across local, optional VP4 staging, and Vultr demo environments.

No provider-specific application fork is permitted.

## 2. Recommended Vultr baseline

Human creates:
- one Ubuntu LTS Vultr Cloud Compute instance;
- public IPv4;
- SSH key access;
- non-root deployment user with sudo;
- firewall/security rules exposing only required ports.

Application runtime uses Docker Compose.

Primary components:

```text
Internet
  ↓
DNS domain
  ↓
Caddy/reverse proxy on Vultr
  ├── /           → web container
  └── /v1/*       → api container
                     ↓
               TigerData/PostgreSQL
                     ↓
          Gemini / ElevenLabs / Backboard
```

TigerData may be a managed external database; it does not need to run on the Vultr instance.

## 3. Required host packages

Minimum:
- Docker Engine;
- Docker Compose plugin;
- Git;
- curl;
- ca-certificates;
- optional fail2ban if setup time permits.

Do not install database locally on production/demo merely because it is convenient if the demo is intended to use TigerData.

## 4. SSH rules

- key-based login;
- root SSH login disabled after working deployment user is confirmed;
- password login disabled where practical after key verification;
- private key remains on authorized client, never repository;
- agent access uses the authorized SSH host configuration.

Human approval is required for key/host setup.

## 5. Runtime containers

Target:
- `web`;
- `api`;
- `caddy` or declared reverse proxy.

Optional:
- simulator runs inside API process/module or dedicated `simulator` container if architecture owner approves;
- do not add Redis/message broker unless a demonstrated requirement exists.

## 6. Environment variables

Canonical variables, actual values supplied out-of-band:

```text
NODE_ENV
PUBLIC_APP_URL
API_BASE_URL
DATABASE_URL

AUTH0_DOMAIN
AUTH0_CLIENT_ID
AUTH0_CLIENT_SECRET
AUTH0_AUDIENCE
AUTH0_SECRET

GEMINI_API_KEY
GEMINI_MODEL

ELEVENLABS_API_KEY
ELEVENLABS_VOICE_ID

BACKBOARD_API_KEY
BACKBOARD_PROJECT_ID

LOG_LEVEL
SIMULATOR_ENABLED
DEMO_SCENARIO_KEY
```

Only variables actually required by implemented adapters remain in final `.env.example`.

## 7. Health endpoints

Required:
- `GET /v1/health/live` — process alive;
- `GET /v1/health/ready` — required dependencies ready enough for state-changing operations;
- `GET /v1/health/integrations` — provider states without secrets.

Reverse proxy/container health checks use these endpoints.

## 8. DNS/TLS

Preferred:
- acquire/configure hackathon demo domain;
- DNS `A` record → Vultr IPv4;
- Caddy obtains TLS automatically after DNS propagation.

Do not block core development on domain propagation. IP/local access remains temporary fallback.

If pursuing GoDaddy prize, domain use must be genuine and visible in final deployed project.

## 9. Firewall

Expose only:
- 22/tcp SSH (prefer restricted source where feasible);
- 80/tcp HTTP;
- 443/tcp HTTPS.

Do not expose PostgreSQL publicly from Vultr unless architecture explicitly requires it and access is secured. Managed TigerData connection is outbound from app.

## 10. Deployment procedure

Canonical:

```bash
git fetch origin
git checkout main
git pull --ff-only
docker compose pull || true
docker compose build
docker compose up -d
docker compose ps
curl -f https://$PUBLIC_HOST/v1/health/live
curl -f https://$PUBLIC_HOST/v1/health/ready
```

Exact Compose paths may evolve, but procedure semantics remain.

## 11. Rollback

Before demo-critical deploy:
- record current commit SHA;
- deploy new commit;
- run smoke tests;
- if failed, checkout previous known-good SHA and rebuild/restart.

Never experiment directly on the only known-good demo instance minutes before judging without a rollback point.

## 12. VP4 role

VP4 may be:
- staging;
- integration sandbox;
- backup/secondary environment.

It is NOT a separate functional codebase.

Same repository and configuration contract apply.

## 13. Observability

Minimum:
- structured application logs;
- container status;
- API correlation IDs;
- integration health page/endpoint;
- error logs without secrets.

Useful commands:

```bash
docker compose ps
docker compose logs --tail=200 api
docker compose logs --tail=200 web
```

## 14. Deployment acceptance

Vultr deployment is accepted when:
- clean clone/build works;
- web loads publicly;
- API health responds;
- DB connectivity works;
- simulator scenario can start;
- SSE reaches browser;
- protected route rejects unauthenticated access;
- one end-to-end demo loop succeeds;
- restart does not destroy persisted DB state;
- no secret exists in public Git history.
