#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'USAGE'
Usage: ./rollback.sh --env-file PATH --compose-file PATH --public-url URL [--state-dir PATH]

Checks out the exact previously recorded commit, rebuilds/restarts Compose, and
checks canonical health endpoints. This does not alter branch history.
USAGE
}

env_file=""
compose_file=""
public_url=""
state_dir=""

while (($#)); do
  case "$1" in
    --env-file) env_file="${2:-}"; shift 2 ;;
    --compose-file) compose_file="${2:-}"; shift 2 ;;
    --public-url) public_url="${2:-}"; shift 2 ;;
    --state-dir) state_dir="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; exit 64 ;;
  esac
done

if [[ -z "${env_file}" || -z "${compose_file}" || -z "${public_url}" ]]; then
  usage >&2
  exit 64
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "Run rollback.sh from inside the ServiceGraph AI repository." >&2
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

if [[ ! -f "${env_file}" || ! -f "${compose_file}" || ! -f "${state_dir}/previous-sha" ]]; then
  echo "Env, Compose and recorded previous-sha files are required." >&2
  exit 66
fi
if [[ "$(stat -c '%a' "${env_file}")" != "600" ]]; then
  echo "Refusing rollback: the populated env file must have mode 0600." >&2
  exit 77
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Refusing rollback from a dirty worktree." >&2
  exit 1
fi
if [[ ! "${public_url}" =~ ^https://[^/]+/?$ ]]; then
  echo "--public-url must be an HTTPS origin without a path." >&2
  exit 64
fi

target_sha="$(tr -d '[:space:]' < "${state_dir}/previous-sha")"
if [[ ! "${target_sha}" =~ ^[0-9a-f]{40}$ ]] || ! git cat-file -e "${target_sha}^{commit}"; then
  echo "Recorded rollback target is not a valid local commit." >&2
  exit 65
fi

failed_sha="$(git rev-parse HEAD)"
git checkout --detach "${target_sha}"

compose=(docker compose --env-file "${env_file}" -f "${compose_file}")
"${compose[@]}" config --quiet
"${compose[@]}" build
"${compose[@]}" up -d --remove-orphans
"${compose[@]}" ps

base_url="${public_url%/}"
curl --fail --show-error --silent --retry 5 --retry-delay 2 "${base_url}/v1/health/live" >/dev/null
curl --fail --show-error --silent --retry 5 --retry-delay 2 "${base_url}/v1/health/ready" >/dev/null

printf '%s\n' "${target_sha}" > "${state_dir}/current-sha"
chmod 0600 "${state_dir}/current-sha"
echo "Rolled back ${failed_sha} to ${target_sha}; liveness/readiness checks passed."
