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

The canonical E2E additionally requires a short-lived incident-manager token. Never save it in a file or commit it:

```bash
API_BASE_URL=http://localhost:3001 \
INCIDENT_MANAGER_TOKEN='runtime-token-only' \
node tests/quality/e2e.mjs
```

Use `tests/quality/VIEWPORT-CHECKLIST.md` for the manual mobile/desktop/tablet pass. A blocked test must not be reported as passing.
