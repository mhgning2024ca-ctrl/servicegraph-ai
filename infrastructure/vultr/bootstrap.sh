#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'USAGE'
Usage: sudo ./bootstrap.sh [--apply-firewall]

Installs Docker Engine, the Compose plugin, Git, curl and host safety packages
on Ubuntu LTS. Firewall changes are opt-in and expose only 22, 80 and 443/tcp.
Review OPERATIONS.md and verify a second SSH session before SSH hardening.
USAGE
}

apply_firewall=false
case "${1:-}" in
  "") ;;
  --apply-firewall) apply_firewall=true ;;
  -h|--help) usage; exit 0 ;;
  *) usage >&2; exit 64 ;;
esac

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script with sudo on the intended Ubuntu Vultr host." >&2
  exit 77
fi

if [[ ! -r /etc/os-release ]]; then
  echo "Cannot identify the host operating system." >&2
  exit 1
fi

# shellcheck disable=SC1091
source /etc/os-release
if [[ "${ID:-}" != "ubuntu" ]]; then
  echo "This bootstrap supports Ubuntu LTS only; detected ${ID:-unknown}." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git gnupg ufw fail2ban

install -m 0755 -d /etc/apt/keyrings
if [[ ! -s /etc/apt/keyrings/docker.asc ]]; then
  curl --fail --show-error --silent --location \
    https://download.docker.com/linux/ubuntu/gpg \
    --output /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi

architecture="$(dpkg --print-architecture)"
repository="deb [arch=${architecture} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable"
if [[ ! -f /etc/apt/sources.list.d/docker.list ]] || ! grep -Fxq "${repository}" /etc/apt/sources.list.d/docker.list; then
  printf '%s\n' "${repository}" > /etc/apt/sources.list.d/docker.list
fi

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker fail2ban

if [[ "${apply_firewall}" == "true" ]]; then
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow 22/tcp comment 'SSH'
  ufw allow 80/tcp comment 'HTTP'
  ufw allow 443/tcp comment 'HTTPS'
  ufw --force enable
fi

docker --version
docker compose version
echo "Bootstrap complete. Do not close the current SSH session until a second key-based session succeeds."
