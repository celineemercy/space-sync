#!/usr/bin/env bash

set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  printf 'Run this script as root: sudo ./deploy/scripts/bootstrap-ubuntu.sh\n' >&2
  exit 1
fi

if [[ ! -r /etc/os-release ]]; then
  printf 'Unable to identify this Linux distribution.\n' >&2
  exit 1
fi

source /etc/os-release
if [[ "${ID}" != "ubuntu" ]]; then
  printf 'This bootstrap script supports Ubuntu only; detected %s.\n' "${ID}" >&2
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl git ufw

install -m 0755 -d /etc/apt/keyrings
curl --fail --silent --show-error --location \
  "https://download.docker.com/linux/ubuntu/gpg" \
  --output /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

architecture="$(dpkg --print-architecture)"
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${VERSION_CODENAME}
Components: stable
Architectures: ${architecture}
Signed-By: /etc/apt/keyrings/docker.asc
EOF

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

login_user="${SUDO_USER:-}"
if [[ -n "${login_user}" && "${login_user}" != "root" ]]; then
  usermod -aG docker "${login_user}"
  printf 'Added %s to the docker group. Sign out and back in before deploying.\n' "${login_user}"
fi

printf 'Ubuntu VPS bootstrap complete. PostgreSQL port 5432 was not exposed.\n'
