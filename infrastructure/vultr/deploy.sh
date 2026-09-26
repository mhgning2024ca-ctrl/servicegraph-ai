#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'USAGE'
Usage: ./deploy.sh --env-file PATH --compose-file PATH --public-url URL [--state-dir PATH] [--ref GIT_REF]

Deploys a validated Git ref (default: origin/main), records the attempted and
live exact commit/image identities, prepares the external database, then checks
canonical health endpoints. Run as the non-root deployment user from a clean
repository clone.
USAGE
}

env_file=""
compose_file=""
public_url=""
state_dir=""
deploy_ref="main"

while (($#)); do
  case "$1" in
    --env-file) env_file="${2:-}"; shift 2 ;;
    --compose-file) compose_file="${2:-}"; shift 2 ;;
    --public-url) public_url="${2:-}"; shift 2 ;;
    --state-dir) state_dir="${2:-}"; shift 2 ;;
    --ref) deploy_ref="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; exit 64 ;;
  esac
done

if [[ -z "${env_file}" || -z "${compose_file}" || -z "${public_url}" ]]; then
  usage >&2
  exit 64
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "Run deploy.sh from inside the ServiceGraph AI repository." >&2
  exit 1
}
cd "${repo_root}"

env_file="$(realpath "${env_file}")"
compose_file="$(realpath "${compose_file}")"
if [[ -z "${state_dir}" ]]; then
  state_dir="$(dirname "${repo_root}")/.servicegraph-deployment-state"
else
  state_dir="$(realpath -m "${state_dir}")"
fi

if [[ ! -f "${env_file}" || ! -f "${compose_file}" ]]; then
  echo "The env file and Compose file must both exist." >&2
  exit 66
fi
if [[ "$(stat -c '%a' "${env_file}")" != "600" ]]; then
  echo "Refusing deployment: the populated env file must have mode 0600." >&2
  exit 77
fi
"${repo_root}/infrastructure/vultr/validate-runtime-env.sh" "${env_file}" "${public_url}"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Refusing deployment from a dirty worktree." >&2
  exit 1
fi
if [[ ! "${public_url}" =~ ^https://[^/]+/?$ ]]; then
  echo "--public-url must be an HTTPS origin without a path." >&2
  exit 64
fi

previous_sha="$(git rev-parse HEAD)"
git fetch origin --prune
if [[ "${deploy_ref}" == "main" ]]; then
  git checkout main
  git pull --ff-only origin main
else
  resolved_ref="$(git rev-parse --verify "${deploy_ref}^{commit}" 2>/dev/null || true)"
  if [[ -z "${resolved_ref}" ]]; then
    resolved_ref="$(git rev-parse --verify "origin/${deploy_ref}^{commit}" 2>/dev/null || true)"
  fi
  if [[ -z "${resolved_ref}" ]]; then
    echo "Cannot resolve deploy ref: ${deploy_ref}" >&2
    exit 65
  fi
  git checkout --detach "${resolved_ref}"
fi
new_sha="$(git rev-parse HEAD)"
image_tag="${new_sha}"

install -d -m 0700 "${state_dir}"
touch "${state_dir}/history.tsv"
chmod 0600 "${state_dir}/history.tsv"
printf '%s\t%s\t%s\t%s\n' "$(date --utc +%FT%TZ)" deploy "${new_sha}" "PENDING" >> "${state_dir}/history.tsv"

on_error() {
  local status="$?"
  printf '%s\t%s\t%s\t%s\n' "$(date --utc +%FT%TZ)" deploy "${new_sha}" "FAILED" >> "${state_dir}/history.tsv"
  exit "${status}"
}
trap on_error ERR

compose=(docker compose --env-file "${env_file}" -f "${compose_file}")
compose_run() { DEPLOYMENT_SHA="${image_tag}" "${compose[@]}" "$@"; }
compose_run config --quiet
compose_run build --pull
compose_run up -d database-init
compose_run up -d --remove-orphans
compose_run ps

base_url="${public_url%/}"
curl --fail --show-error --silent --retry 5 --retry-delay 2 "${base_url}/v1/health/live" >/dev/null
curl --fail --show-error --silent --retry 5 --retry-delay 2 "${base_url}/v1/health/ready" >/dev/null

printf '%s\n' "${previous_sha}" > "${state_dir}/previous-sha"
printf '%s\n' "${new_sha}" > "${state_dir}/current-sha"
printf '%s\n' "${image_tag}" > "${state_dir}/current-image-tag"
chmod 0600 "${state_dir}/previous-sha" "${state_dir}/current-sha" "${state_dir}/current-image-tag"
printf '%s\t%s\t%s\t%s\n' "$(date --utc +%FT%TZ)" deploy "${new_sha}" "LIVE" >> "${state_dir}/history.tsv"
trap - ERR
echo "Deployment ${new_sha} (image tag ${image_tag}) is live and passed database, liveness, and readiness checks."
