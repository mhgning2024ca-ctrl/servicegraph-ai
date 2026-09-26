# Quality runner

Run all checks from any directory:

```bash
bash scripts/quality/run-quality.sh
```

Exit codes are intentional:

- `0`: every check passed;
- `1`: at least one check failed;
- `2`: no failure, but one or more prerequisites are not integrated/configured.

Static contract and secret checks run with Bash/Git only. The remaining checks require Node.js 20+; the runner reports them as `BLOCKED` when Node is absent. Component suites activate after their packages are merged and installed. HTTP checks require a running API:

```bash
API_BASE_URL=http://localhost:3001 node tests/quality/api-smoke.mjs
```

`tests/quality/e2e.mjs` remains the canonical deterministic orchestration coverage used by normal CI. The live vertical harness is intentionally separate at `tests/quality/live-e2e.mjs`: it creates a UUID-tagged report, retrieves that same report, writes live telemetry, requires a newly correlated incident (never `INC-2048`), checks unauthorized and incident-manager approval separately, executes, verifies `RESOLVED`, and checks public status. It does not boot the deterministic runtime.

It exits `BLOCKED` until these uncommitted environment values are available. Never save token values in a file or commit them:

```bash
API_BASE_URL=http://localhost:3001 \
DATABASE_URL='<your-database-url>' \
INCIDENT_MANAGER_TOKEN='runtime-token-only' \
REPORT_READ_HEADERS_JSON='{"authorization":"Bearer runtime-only"}' \
TELEMETRY_HEADERS_JSON='{"authorization":"Bearer runtime-only"}' \
LIVE_TELEMETRY_NODE_ID='runtime-node-uuid' \
node tests/quality/live-e2e.mjs
```

The two JSON header values are request-header objects for the existing live receipt/owner and internal telemetry credentials. They are test configuration only; they do not define or alter the API contract. A configured runtime still fails if TigerData is unavailable or reports `DEMO_MOCK_MODE`.

`tests/quality/frozen-route-inventory.mjs` is a registration contract: it fails when a frozen route has no handler or when its route module is not wired into `createApiApp()`.

Use `tests/quality/VIEWPORT-CHECKLIST.md` for the manual mobile/desktop/tablet pass. A blocked test must not be reported as passing.
