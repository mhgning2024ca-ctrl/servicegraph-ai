#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'USAGE'
Usage: prepare-database.sh [--skip-seed]

Applies the committed PostgreSQL/TigerData migration baseline and deterministic
topology seed exactly once per file checksum. The runner uses a PostgreSQL
advisory lock, so only one deployment can prepare the shared external database
at a time. It never prints DATABASE_URL or any other environment value.
USAGE
}

apply_seed=true
case "${1:-}" in
  "") ;;
  --skip-seed) apply_seed=false ;;
  -h|--help) usage; exit 0 ;;
  *) usage >&2; exit 64 ;;
esac

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required for database preparation." >&2
  exit 64
fi
if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required for database preparation." >&2
  exit 69
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
runner="$(mktemp)"
trap 'rm -f "${runner}"' EXIT

write_file_block() {
  local directory="$1"
  local kind="$2"
  local filename checksum absolute_path

  for absolute_path in "${directory}"/*.sql; do
    [[ -f "${absolute_path}" ]] || continue
    filename="$(basename "${absolute_path}")"
    checksum="$(sha256sum "${absolute_path}" | awk '{print $1}')"

    printf "\\set prepared_filename '%s'\n" "${filename}" >> "${runner}"
    printf "\\set prepared_checksum '%s'\n" "${checksum}" >> "${runner}"
    printf "SELECT COALESCE((SELECT checksum = :'prepared_checksum' FROM servicegraph_runtime_files WHERE kind = '%s' AND filename = :'prepared_filename'), TRUE) AS checksum_matches \\gset\n" "${kind}" >> "${runner}"
    printf "\\if :checksum_matches\n" >> "${runner}"
    printf "SELECT NOT EXISTS (SELECT 1 FROM servicegraph_runtime_files WHERE kind = '%s' AND filename = :'prepared_filename') AS should_apply \\gset\n" "${kind}" >> "${runner}"
    printf "\\if :should_apply\n" >> "${runner}"
    printf "\\i %s\n" "${absolute_path}" >> "${runner}"
    printf "INSERT INTO servicegraph_runtime_files (kind, filename, checksum) VALUES ('%s', :'prepared_filename', :'prepared_checksum');\n" "${kind}" >> "${runner}"
    printf "\\endif\n" >> "${runner}"
    printf "\\else\n\\echo Refusing changed committed %s file :prepared_filename\nSELECT 1 / 0;\n\\endif\n" "${kind}" >> "${runner}"
  done
}

cat > "${runner}" <<'PSQL'
\set ON_ERROR_STOP on
SELECT pg_advisory_lock(hashtext('servicegraph-runtime-database-preparation-v1'));
CREATE TABLE IF NOT EXISTS servicegraph_runtime_files (
  kind text NOT NULL CHECK (kind IN ('migration', 'seed')),
  filename text NOT NULL,
  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, filename)
);
PSQL

write_file_block "${repo_root}/database/migrations" migration
if [[ "${apply_seed}" == "true" ]]; then
  write_file_block "${repo_root}/database/seeds" seed
fi
printf "SELECT pg_advisory_unlock(hashtext('servicegraph-runtime-database-preparation-v1'));\n" >> "${runner}"

psql "${DATABASE_URL}" --no-psqlrc --set ON_ERROR_STOP=1 --file "${runner}" >/dev/null
echo "Committed database migrations and deterministic topology seed are ready."
