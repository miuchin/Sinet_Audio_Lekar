#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/port_guard.sh"
source "$ROOT_DIR/scripts/runtime_config_lib.sh"

CONFIG_SERVER_PORT="$(runtime_read_config_value "$ROOT_DIR" "server_port" "8120")"
BRIDGE_PORT="$(runtime_read_config_value "$ROOT_DIR" "bridge_port" "8121")"
PORT="${1:-$CONFIG_SERVER_PORT}"

validate_sinet_port "$PORT"
validate_sinet_port "$BRIDGE_PORT"

curl -s -X POST "http://127.0.0.1:${BRIDGE_PORT}/api/start" \
  -H "Content-Type: application/json" \
  --data "$(printf '{"port": %s}' "$PORT")" || true
