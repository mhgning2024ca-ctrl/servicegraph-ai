# Vultr operations runbook

## Human-owned preparation

1. Create one Ubuntu LTS Vultr Cloud Compute instance and accept account terms.
2. Add an approved SSH public key. Never copy a private key into this repository.
3. Create a non-root deployment user with sudo access and confirm key login.
4. Run `sudo infrastructure/vultr/bootstrap.sh`.
5. Keep the first SSH session open, confirm a second key-based session, then run
   `sudo infrastructure/vultr/bootstrap.sh --apply-firewall`.
6. Restrict port 22 to trusted source addresses in the Vultr firewall when
   feasible. Expose only 22/tcp, 80/tcp and 443/tcp. Never expose PostgreSQL.

The script intentionally does not disable root/password SSH automatically. Only
after the deployment user's key-based login is verified, a human may set:

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Validate SSH configuration before reload, keep an existing session open, and
confirm another login afterward. Coordinate equivalent Vultr firewall rules;
host UFW does not replace the provider firewall.

## Secrets and environment

Copy `infrastructure/env/production.env.example` to a host-only path outside the
Git clone, populate it out-of-band, then apply mode `0600`. Never print or commit
the populated file. Managed TigerData must require TLS according to its supplied
`DATABASE_URL` and accepts outbound connections from the application.

Unavailable optional providers must remain explicit degraded states; do not put
fake credentials in the environment to force a success state.

## DNS and TLS

After the public IPv4 is stable, a human creates the DNS A record. Render
`infrastructure/reverse-proxy/Caddyfile.template` only after the integrated web
and API internal upstreams are documented. Caddy uses `PUBLIC_APP_URL` as the
site address and obtains TLS after DNS propagation.

Do not block local/integration work on DNS. Production readiness and HSTS should
be claimed only after HTTPS is confirmed.

## Deployment

The integration owner must first supply a canonical Compose file whose only
published ports are 80 and 443 on Caddy. Web, API and database ports remain on a
private Compose network; the managed database is outbound-only.

From a clean clone as the deployment user:

```bash
chmod 600 /secure/path/servicegraph.production.env
infrastructure/vultr/deploy.sh \
  --env-file /secure/path/servicegraph.production.env \
  --compose-file /absolute/path/to/docker-compose.yml \
  --public-url https://servicegraph.example.org
```

The deploy command records the exact previous/current commit, updates `main`
with `--ff-only`, validates Compose, builds, starts and checks:

- `GET /v1/health/live`
- `GET /v1/health/ready`

Then verify manually:

```bash
docker compose --env-file /secure/path/servicegraph.production.env -f /absolute/path/to/docker-compose.yml ps
docker compose --env-file /secure/path/servicegraph.production.env -f /absolute/path/to/docker-compose.yml logs --tail=200 api
docker compose --env-file /secure/path/servicegraph.production.env -f /absolute/path/to/docker-compose.yml logs --tail=200 web
```

Also verify public web loading, DB connectivity, SSE, unauthenticated rejection
of a protected route and the deterministic `node17-degradation` scenario.

## Rollback

If smoke checks fail, use the recorded exact SHA:

```bash
infrastructure/vultr/rollback.sh \
  --env-file /secure/path/servicegraph.production.env \
  --compose-file /absolute/path/to/docker-compose.yml \
  --public-url https://servicegraph.example.org
```

Rollback checks out the prior commit detached, rebuilds, restarts and repeats
liveness/readiness checks. It never rewrites Git history. After stabilization,
investigate on a feature branch and redeploy `main`; do not patch the only demo
host directly.

Before any production cleanup or rollback image deletion, record its identity,
restorable backup and replacement in `/home/ubuntu/PROJECT-UPGRADES-DAILY.md`.
