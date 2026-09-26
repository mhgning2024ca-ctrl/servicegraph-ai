#!/usr/bin/env bash
set -uo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
api="${repo_root}/docs/03_API_DATA_CONTRACTS.md"
rbac="${repo_root}/docs/13_SECURITY_RBAC_MATRIX.md"
demo="${repo_root}/docs/08_DEMO_ACCEPTANCE.md"
master="${repo_root}/docs/00_MASTER_SPEC.md"
errors=()

for path in AGENTS.md docs/00_MASTER_SPEC.md docs/03_API_DATA_CONTRACTS.md docs/08_DEMO_ACCEPTANCE.md docs/13_SECURITY_RBAC_MATRIX.md docs/23_CONTRACT_FREEZE_V1.md; do
  [[ -f "${repo_root}/${path}" ]] || errors+=("missing ${path}")
done

if [[ ${#errors[@]} -eq 0 ]]; then
  for token in DETECTED INVESTIGATING CONFIRMED REMEDIATION_PROPOSED AWAITING_APPROVAL REJECTED REMEDIATING VERIFYING RESOLVED CLOSED; do
    grep -Fq "$token" "$api" || errors+=("IncidentStatus missing ${token}")
  done
  for token in \
    'POST /v1/reports' \
    'GET /v1/incidents' \
    'POST /v1/incidents/:id/analyze' \
    'POST /v1/remediation-proposals/:proposalId/decision' \
    'POST /v1/remediation-proposals/:proposalId/execute' \
    'POST /v1/incidents/:id/verify' \
    'POST /v1/incidents/:id/communications' \
    'POST /v1/simulator/scenarios/:scenarioKey/start' \
    'GET /v1/events/stream'; do
    grep -Fq "$token" "$api" || errors+=("API contract missing ${token}")
  done
  for token in incidents:read incidents:analyze remediation:propose remediation:approve remediation:execute incidents:verify communications:create simulator:control; do
    grep -Fq "$token" "$rbac" || errors+=("RBAC missing ${token}")
  done
  for token in NODE-17 INC-2048 'unauthorized approval' idempotent 'FR | EN'; do
    grep -Fq "$token" "$demo" "$api" "$master" || errors+=("demo acceptance missing ${token}")
  done
fi

if [[ ${#errors[@]} -gt 0 ]]; then
  echo 'FAIL: frozen contracts are incomplete or inconsistent' >&2
  for error in "${errors[@]}"; do echo "  - ${error}" >&2; done
  exit 1
fi
echo 'PASS: frozen routes, states, RBAC, and demo identifiers are present'
