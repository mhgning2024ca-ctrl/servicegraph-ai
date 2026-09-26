#!/usr/bin/env bash
set -uo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"
findings=()

while IFS= read -r match; do
  [[ -n "$match" ]] && findings+=("$match")
done < <(git grep -nIE -- '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|AIza[0-9A-Za-z_-]{30,}|sk-[0-9A-Za-z_-]{24,}|github_pat_[0-9A-Za-z_]{30,}' -- ':!pnpm-lock.yaml' 2>/dev/null || true)

while IFS= read -r match; do
  [[ -z "$match" ]] && continue
  value="${match#*=}"
  if [[ ! "$value" =~ (example|placeholder|change[-_[:space:]]?me|your[-_]|\<.*\>|\$\{|localhost) ]]; then
    findings+=("$match")
  fi
done < <(git grep -nE -- '^(GEMINI_API_KEY|ELEVENLABS_API_KEY|AUTH0_CLIENT_SECRET|AUTH0_SECRET|BACKBOARD_API_KEY|DATABASE_URL)=.+' -- ':!pnpm-lock.yaml' 2>/dev/null || true)

if [[ ${#findings[@]} -gt 0 ]]; then
  echo 'FAIL: potential committed secrets detected' >&2
  for finding in "${findings[@]}"; do echo "  - ${finding}" >&2; done
  exit 1
fi
echo 'PASS: tracked files contain no recognized real-secret patterns'

