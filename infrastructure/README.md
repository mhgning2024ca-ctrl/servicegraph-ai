# ServiceGraph AI infrastructure

This directory contains the provider-neutral deployment assets for the Vultr
demo host. Human operators retain control of the Vultr account, SSH keys,
firewall, DNS, secrets, deployment and rollback.

## Current integration boundary

The repository's application branches do not yet expose a complete, integrated
container build contract. In particular, the API has no documented executable
start command/listen port and the root pnpm workspace/lockfile is not present on
`main`. Therefore this branch deliberately does **not** invent Dockerfiles,
internal application ports or a root `docker-compose.yml`.

Once A7 integrates the application build contracts, render
`reverse-proxy/Caddyfile.template` with the documented internal web/API
upstreams and add the coordinated root Compose file. The public exposure must
remain limited to 22/tcp, 80/tcp and 443/tcp; PostgreSQL must remain private.

## Files

- `env/production.env.example`: frozen runtime variable names, without secrets.
- `reverse-proxy/Caddyfile.template`: TLS proxy and security-header template.
- `vultr/bootstrap.sh`: idempotent Ubuntu Docker host preparation.
- `vultr/deploy.sh`: guarded, fast-forward-only main deployment procedure.
- `vultr/rollback.sh`: exact-SHA rollback using the recorded deployment state.
- `vultr/OPERATIONS.md`: Vultr, SSH, firewall, DNS, deploy and rollback runbook.
- `tests/validate.sh`: repository-local static checks.

## Local static validation

```bash
bash infrastructure/tests/validate.sh
```

The validation script intentionally does not claim that application images can
build before the shared application container contract exists.
