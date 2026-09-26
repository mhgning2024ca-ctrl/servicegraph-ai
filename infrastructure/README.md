# ServiceGraph AI infrastructure

This directory contains the provider-neutral deployment assets for the Vultr
demo host. Human operators retain control of the Vultr account, SSH keys,
firewall, DNS, secrets, deployment and rollback.

## Runtime contract

The canonical root `docker-compose.yml` builds web and API images from the same
checked-out commit, tags each application image with `DEPLOYMENT_SHA`, and
publishes only Caddy on 80/443. PostgreSQL is intentionally not a Compose
service: `DATABASE_URL` points to the external TigerData/PostgreSQL runtime.

`database-init` is a one-shot container that runs before API startup. It takes a
PostgreSQL advisory lock, records migration/seed file checksums, applies each
committed migration and deterministic topology seed once, and rejects a changed
already-applied file. API readiness is therefore not reached before the
external database schema is present. Optional provider credentials remain
explicitly degraded when omitted; required production Auth0/database values are
validated by name and never echoed.

## Files

- `env/production.env.example`: frozen runtime variable names, without secrets.
- `runtime/prepare-database.sh`: locked, checksum-tracked migration/seed runner.
- `docker/db-init.Dockerfile`: one-shot external database preparation image.
- `reverse-proxy/Caddyfile`: canonical TLS proxy and security headers.
- `vultr/bootstrap.sh`: idempotent Ubuntu Docker host preparation.
- `vultr/deploy.sh`: guarded deployment with SHA-tagged images and evidence log.
- `vultr/rollback.sh`: exact-SHA/image rollback without rebuilding the artifact.
- `vultr/validate-runtime-env.sh`: secret-safe required-variable validation.
- `vultr/OPERATIONS.md`: Vultr, SSH, firewall, DNS, deploy and rollback runbook.
- `tests/validate.sh`: repository-local static checks.

## Local static validation

```bash
bash infrastructure/tests/validate.sh
```

The static check renders Compose with a non-secret fixture environment and
verifies database gating, no direct DB/API/web port publication, image identity,
and all required package builds in the API image. It is not a substitute for a
real TigerData connection or a deployed smoke test.
