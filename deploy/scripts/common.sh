#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_DIR="$(cd "${DEPLOY_DIR}/.." && pwd)"
ENV_FILE="${CAMPUSSPACE_ENV_FILE:-${DEPLOY_DIR}/.env.vps}"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.vps.yml"

fail() {
  printf 'CampusSpace deployment error: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command '$1' is not installed."
}

require_environment() {
  [[ -f "${ENV_FILE}" ]] || fail "Missing ${ENV_FILE}. Copy deploy/.env.vps.example and set production values."

  if grep -Eq 'replace-with|example\.com|URL_ENCODED_PASSWORD' "${ENV_FILE}"; then
    fail "${ENV_FILE} still contains placeholder values."
  fi
}

compose() {
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
}

wait_for_health() {
  local container_id="$1"
  local service_name="$2"
  local attempts="${3:-60}"

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    local status
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${container_id}" 2>/dev/null || true)"
    if [[ "${status}" == "healthy" ]]; then
      return 0
    fi
    if [[ "${status}" == "unhealthy" || "${status}" == "exited" || "${status}" == "dead" ]]; then
      compose logs --tail 100 "${service_name}" >&2 || true
      fail "${service_name} entered state '${status}'."
    fi
    sleep 2
  done

  compose logs --tail 100 "${service_name}" >&2 || true
  fail "Timed out waiting for ${service_name} to become healthy."
}
