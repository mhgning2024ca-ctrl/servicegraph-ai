#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "${repo_root}"

scripts=(
  infrastructure/vultr/bootstrap.sh
  infrastructure/vultr/deploy.sh
  infrastructure/vultr/rollback.sh
  infrastructure/vultr/validate-runtime-env.sh
  infrastructure/runtime/prepare-database.sh
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

grep -Fq 'database-init:' docker-compose.yml
grep -Fq 'condition: service_completed_successfully' docker-compose.yml
grep -Fq 'DEPLOYMENT_SHA is required to preserve artifact identity' docker-compose.yml
grep -Fq '@servicegraph/db build' infrastructure/docker/api.Dockerfile
grep -Fq '@servicegraph/ai build' infrastructure/docker/api.Dockerfile
grep -Fq '@servicegraph/backboard build' infrastructure/docker/api.Dockerfile
grep -Fq 'postgres:17-alpine' infrastructure/docker/db-init.Dockerfile
if grep -Eq '^[[:space:]]+(5432|3000|3001):' docker-compose.yml; then
  echo "Compose must not publish database or direct application ports." >&2
  exit 1
fi

runtime_env="$(mktemp)"
trap 'rm -f "${runtime_env}"' EXIT
cat > "${runtime_env}" <<'ENV'
NODE_ENV=production
PUBLIC_APP_URL=https://servicegraph.example.org
API_BASE_URL=https://servicegraph.example.org/v1
DATABASE_URL=postgresql://runtime-user:placeholder@tigerdata.example.org:5432/servicegraph?sslmode=require
CORS_ALLOWED_ORIGINS=https://servicegraph.example.org
LOG_LEVEL=info
SIMULATOR_ENABLED=true
DEMO_SCENARIO_KEY=node17-degradation
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
ELEVENLABS_STT_MODEL=scribe_v2
ELEVENLABS_TTS_MODEL=eleven_multilingual_v2
AUTH0_DOMAIN=tenant.example.auth0.com
AUTH0_CLIENT_ID=placeholder-client-id
AUTH0_CLIENT_SECRET=placeholder-client-secret
AUTH0_AUDIENCE=https://servicegraph.example.org/api
AUTH0_SECRET=placeholder-session-secret
AUTH0_BASE_URL=https://servicegraph.example.org
AUTH0_ROLES_CLAIM=https://servicegraph.ai/roles
BACKBOARD_API_KEY=
BACKBOARD_ASSISTANT_ID=
API_HOST=0.0.0.0
API_PORT=3001
AUTH_MODE=auth0
NEXT_PUBLIC_API_BASE_URL=/v1
DEPLOYMENT_SHA=static-validation
ENV
chmod 0600 "${runtime_env}"
infrastructure/vultr/validate-runtime-env.sh "${runtime_env}" https://servicegraph.example.org >/dev/null
docker compose --env-file "${runtime_env}" -f docker-compose.yml config --quiet

if grep -RInE --exclude='*.md' --exclude='validate.sh' \
  '(BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z]{20,})' infrastructure; then
  echo "Potential secret material found in infrastructure files." >&2
  exit 1
fi

echo "Infrastructure static validation passed."
