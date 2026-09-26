#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  echo "Usage: validate-runtime-env.sh ENV_FILE PUBLIC_URL" >&2
}

if [[ $# -ne 2 ]]; then
  usage
  exit 64
fi

env_file="$1"
public_url="$2"
if [[ ! -f "${env_file}" ]]; then
  echo "Runtime env file is required." >&2
  exit 66
fi

has_value() {
  local key="$1"
  grep -Eq "^${key}=[[:space:]]*[^[:space:]#]" "${env_file}"
}

value_for() {
  local key="$1"
  sed -n "s/^${key}=//p" "${env_file}" | tail -n 1
}

require_value() {
  local key="$1"
  if ! has_value "${key}"; then
    echo "Required runtime variable ${key} is empty or absent." >&2
    exit 64
  fi
}

for key in NODE_ENV PUBLIC_APP_URL API_BASE_URL DATABASE_URL CORS_ALLOWED_ORIGINS AUTH_MODE; do
  require_value "${key}"
done

if [[ "$(value_for NODE_ENV)" != "production" ]]; then
  echo "NODE_ENV must be production for a Vultr deployment." >&2
  exit 64
fi
if [[ "$(value_for AUTH_MODE)" != "auth0" ]]; then
  echo "AUTH_MODE must be auth0 for a Vultr deployment." >&2
  exit 64
fi
if [[ "$(value_for PUBLIC_APP_URL)" != "${public_url}" ]]; then
  echo "PUBLIC_APP_URL must match --public-url." >&2
  exit 64
fi
if [[ ! "${public_url}" =~ ^https://[^/]+/?$ ]]; then
  echo "PUBLIC_URL must be an HTTPS origin without a path." >&2
  exit 64
fi

for key in AUTH0_DOMAIN AUTH0_CLIENT_ID AUTH0_CLIENT_SECRET AUTH0_AUDIENCE AUTH0_SECRET AUTH0_BASE_URL; do
  require_value "${key}"
done

backboard_key="$(value_for BACKBOARD_API_KEY)"
backboard_assistant="$(value_for BACKBOARD_ASSISTANT_ID)"
if [[ -n "${backboard_key}" && -z "${backboard_assistant}" ]] || [[ -z "${backboard_key}" && -n "${backboard_assistant}" ]]; then
  echo "BACKBOARD_API_KEY and BACKBOARD_ASSISTANT_ID must be set together or both omitted." >&2
  exit 64
fi

echo "Required runtime environment names are valid."
