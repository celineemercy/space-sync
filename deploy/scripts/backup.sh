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
backup_path="${backup_dir}/space-sync-${timestamp}.sql.gz"
document_backup_path="${backup_dir}/space-sync-${timestamp}.documents.tar.gz"
temporary_path="${backup_path}.partial"
document_temporary_path="${document_backup_path}.partial"

cleanup() {
  rm -f -- "${temporary_path}" "${document_temporary_path}"
}
trap cleanup EXIT

compose exec -T db sh -c 'pg_dump --clean --if-exists --no-owner --no-privileges --username="$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip -9 > "${temporary_path}"
mv -- "${temporary_path}" "${backup_path}"
chmod 600 "${backup_path}"
compose exec -T server tar -C /app/private-documents -czf - . > "${document_temporary_path}"
mv -- "${document_temporary_path}" "${document_backup_path}"
chmod 600 "${document_backup_path}"

retention_days="$(sed -n 's/^BACKUP_RETENTION_DAYS=//p' "${ENV_FILE}" | tail -n 1 | tr -d '\r')"
retention_days="${retention_days:-14}"
[[ "${retention_days}" =~ ^[0-9]+$ ]] || fail 'BACKUP_RETENTION_DAYS must be a non-negative integer.'
find "${backup_dir}" -maxdepth 1 -type f -name 'space-sync-*.sql.gz' -mtime "+${retention_days}" -delete
find "${backup_dir}" -maxdepth 1 -type f -name 'space-sync-*.documents.tar.gz' -mtime "+${retention_days}" -delete

printf 'Backup written to %s\n' "${backup_path}"
