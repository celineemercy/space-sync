#!/usr/bin/env bash

set -Eeuo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

require_command docker
require_environment

if ! grep -Eq '^SEED_DEMO_PASSWORD=.{10,}$' "${ENV_FILE}"; then
  fail 'SEED_DEMO_PASSWORD must be set to at least 10 characters before intentional demo seeding.'
fi

printf 'This updates the controlled CampusSpace demo users and reference data.\n'
printf 'It does not run automatically during deployment.\n'
compose run --rm server npm run db:seed
