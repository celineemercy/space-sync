#!/usr/bin/env bash

set -Eeuo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

require_command docker
require_command curl
require_environment

cd "${PROJECT_DIR}"

printf 'Building the CampusSpace API image...\n'
compose build --pull server

printf 'Starting PostgreSQL...\n'
compose up -d db
database_container="$(compose ps -q db)"
[[ -n "${database_container}" ]] || fail 'PostgreSQL container was not created.'
wait_for_health "${database_container}" db

printf 'Applying database migrations...\n'
compose run --rm --no-deps server npx prisma migrate deploy

printf 'Starting the API and HTTPS proxy...\n'
compose up -d server
server_container="$(compose ps -q server)"
[[ -n "${server_container}" ]] || fail 'API container was not created.'
wait_for_health "${server_container}" server
compose up -d proxy

api_domain="$(sed -n 's/^API_DOMAIN=//p' "${ENV_FILE}" | tail -n 1 | tr -d '\r')"
[[ -n "${api_domain}" ]] || fail 'API_DOMAIN is missing from the VPS environment file.'

printf 'Waiting for public HTTPS health check...\n'
for attempt in {1..30}; do
  if curl --fail --silent --show-error "https://${api_domain}/api/v1/health" >/dev/null; then
    compose ps
    printf 'CampusSpace is available at https://%s/api/v1\n' "${api_domain}"
    exit 0
  fi
  sleep 2
done

compose logs --tail 100 proxy server >&2 || true
fail 'The public HTTPS health check did not become ready.'
