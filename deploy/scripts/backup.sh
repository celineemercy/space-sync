#!/usr/bin/env bash

set -Eeuo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

require_command docker
require_command gzip
require_environment

backup_dir="${DEPLOY_DIR}/backups"
mkdir -p "${backup_dir}"
chmod 700 "${backup_dir}"

timestamp="$(date -u +'%Y%m%dT%H%M%SZ')"
backup_path="${backup_dir}/campus-space-${timestamp}.sql.gz"
temporary_path="${backup_path}.partial"

cleanup() {
  rm -f -- "${temporary_path}"
}
trap cleanup EXIT

compose exec -T db sh -c 'pg_dump --clean --if-exists --no-owner --no-privileges --username="$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip -9 > "${temporary_path}"
mv -- "${temporary_path}" "${backup_path}"
chmod 600 "${backup_path}"

retention_days="$(sed -n 's/^BACKUP_RETENTION_DAYS=//p' "${ENV_FILE}" | tail -n 1 | tr -d '\r')"
retention_days="${retention_days:-14}"
[[ "${retention_days}" =~ ^[0-9]+$ ]] || fail 'BACKUP_RETENTION_DAYS must be a non-negative integer.'
find "${backup_dir}" -maxdepth 1 -type f -name 'campus-space-*.sql.gz' -mtime "+${retention_days}" -delete

printf 'Backup written to %s\n' "${backup_path}"
