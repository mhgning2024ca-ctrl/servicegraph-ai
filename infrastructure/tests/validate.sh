#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "${repo_root}"

scripts=(
  infrastructure/vultr/bootstrap.sh
  infrastructure/vultr/deploy.sh
  infrastructure/vultr/rollback.sh
  infrastructure/tests/validate.sh
)
for script in "${scripts[@]}"; do
  bash -n "${script}"
done

expected_vars=(
  NODE_ENV PUBLIC_APP_URL API_BASE_URL DATABASE_URL CORS_ALLOWED_ORIGINS LOG_LEVEL
  SIMULATOR_ENABLED DEMO_SCENARIO_KEY GEMINI_API_KEY GEMINI_MODEL
  ELEVENLABS_API_KEY ELEVENLABS_VOICE_ID ELEVENLABS_STT_MODEL ELEVENLABS_TTS_MODEL
  AUTH0_DOMAIN AUTH0_CLIENT_ID AUTH0_CLIENT_SECRET AUTH0_AUDIENCE AUTH0_SECRET
  AUTH0_BASE_URL BACKBOARD_API_KEY BACKBOARD_ASSISTANT_ID
)
for variable in "${expected_vars[@]}"; do
  if ! grep -Eq "^${variable}=" infrastructure/env/production.env.example; then
    echo "Missing frozen runtime variable: ${variable}" >&2
    exit 1
  fi
done

if grep -Eq '^[[:space:]]*(5432|3000|3001)/tcp' infrastructure/vultr/OPERATIONS.md; then
  echo "Runbook appears to expose an undocumented public application/database port." >&2
  exit 1
fi

for endpoint in /v1/health/live /v1/health/ready; do
  grep -Fq "${endpoint}" infrastructure/vultr/deploy.sh
  grep -Fq "${endpoint}" infrastructure/vultr/rollback.sh
done

grep -Fq '{{WEB_UPSTREAM}}' infrastructure/reverse-proxy/Caddyfile.template
grep -Fq '{{API_UPSTREAM}}' infrastructure/reverse-proxy/Caddyfile.template

if grep -RInE --exclude='*.md' --exclude='validate.sh' \
  '(BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z]{20,})' infrastructure; then
  echo "Potential secret material found in infrastructure files." >&2
  exit 1
fi

echo "Infrastructure static validation passed."
