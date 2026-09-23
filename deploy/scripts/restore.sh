#!/usr/bin/env bash

set -Eeuo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

require_command docker
require_command gzip
require_environment

[[ "${1:-}" == "--confirm" ]] || fail 'Restore is destructive. Usage: restore.sh --confirm deploy/backups/<backup>.sql.gz'
backup_input="${2:-}"
[[ -n "${backup_input}" ]] || fail 'A backup file is required.'

backup_dir="$(cd "${DEPLOY_DIR}/backups" 2>/dev/null && pwd)" || fail 'The backup directory does not exist.'
backup_path="$(cd "$(dirname "${backup_input}")" 2>/dev/null && pwd)/$(basename "${backup_input}")"
[[ "${backup_path}" == "${backup_dir}/"* ]] || fail 'The restore file must be inside deploy/backups.'
[[ -f "${backup_path}" ]] || fail "Backup file not found: ${backup_path}"

printf 'Restoring %s into the configured CampusSpace database...\n' "${backup_path}"
gzip -dc -- "${backup_path}" | compose exec -T db sh -c 'psql --set ON_ERROR_STOP=on --username="$POSTGRES_USER" "$POSTGRES_DB"'
printf 'Restore completed. Restarting the API...\n'
compose restart server
