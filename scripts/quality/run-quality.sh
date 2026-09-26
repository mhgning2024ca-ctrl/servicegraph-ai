#!/usr/bin/env bash
set -uo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
shell_tests=(contracts.sh secrets.sh)
node_tests=(implementation-contracts.mjs components.mjs ui-smoke.mjs api-smoke.mjs e2e.mjs)
failed=0
blocked=0

for test_file in "${shell_tests[@]}"; do
  echo "== quality/${test_file} =="
  bash "${repo_root}/tests/quality/${test_file}"
  status=$?
  if [[ $status -eq 1 ]]; then
    failed=$((failed + 1))
  elif [[ $status -eq 2 ]]; then
    blocked=$((blocked + 1))
  elif [[ $status -ne 0 ]]; then
    echo "FAIL: ${test_file} exited with unexpected status ${status}"
    failed=$((failed + 1))
  fi
done

node_bin="$(command -v node || command -v nodejs || true)"
if [[ -z "$node_bin" ]]; then
  for test_file in "${node_tests[@]}"; do
    echo "== quality/${test_file} =="
    echo "BLOCKED: ${test_file} requires Node.js 20+"
    blocked=$((blocked + 1))
  done
else
  for test_file in "${node_tests[@]}"; do
    echo "== quality/${test_file} =="
    "$node_bin" "${repo_root}/tests/quality/${test_file}"
    status=$?
    if [[ $status -eq 1 ]]; then
      failed=$((failed + 1))
    elif [[ $status -eq 2 ]]; then
      blocked=$((blocked + 1))
    elif [[ $status -ne 0 ]]; then
      echo "FAIL: ${test_file} exited with unexpected status ${status}"
      failed=$((failed + 1))
    fi
  done
fi

total=$(( ${#shell_tests[@]} + ${#node_tests[@]} ))
echo "QUALITY_SUMMARY PASS=$(( total - failed - blocked )) FAIL=${failed} BLOCKED=${blocked}"
if [[ $failed -gt 0 ]]; then exit 1; fi
if [[ $blocked -gt 0 ]]; then exit 2; fi
