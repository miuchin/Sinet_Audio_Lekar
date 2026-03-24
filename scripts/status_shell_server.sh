#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/runtime_config_lib.sh"

BRIDGE_PORT="$(runtime_read_config_value "$ROOT_DIR" "bridge_port" "8121")"
curl -s "http://127.0.0.1:${BRIDGE_PORT}/api/status" || true
