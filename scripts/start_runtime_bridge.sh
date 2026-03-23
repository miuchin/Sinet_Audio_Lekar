#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/port_guard.sh"
source "$ROOT_DIR/scripts/runtime_config_lib.sh"

LOG_FILE="$ROOT_DIR/data/runtime/runtime_bridge.log"
PID_FILE="$ROOT_DIR/data/runtime/runtime_bridge.pid"
BRIDGE_PORT="$(runtime_read_config_value "$ROOT_DIR" "bridge_port" "8121")"
validate_sinet_port "$BRIDGE_PORT"
BRIDGE_URL="http://127.0.0.1:${BRIDGE_PORT}/api/health"
mkdir -p "$ROOT_DIR/data/runtime"

restart_needed="false"
if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    CURRENT_ARGS="$(ps -p "$OLD_PID" -o args= 2>/dev/null || true)"
    if [[ "$CURRENT_ARGS" == *"--port ${BRIDGE_PORT}"* ]]; then
      if curl -fsS "$BRIDGE_URL" >/dev/null 2>&1; then
        echo "Runtime bridge already running on http://127.0.0.1:${BRIDGE_PORT}"
        exit 0
      fi
    fi
    kill "$OLD_PID" 2>/dev/null || true
    for _ in {1..20}; do
      if ! kill -0 "$OLD_PID" 2>/dev/null; then
        break
      fi
      sleep 0.1
    done
    restart_needed="true"
  fi
  rm -f "$PID_FILE"
fi

nohup python3 "$ROOT_DIR/server/runtime_control_bridge.py" --port "$BRIDGE_PORT" >> "$LOG_FILE" 2>&1 &
BRIDGE_PID=$!
echo "$BRIDGE_PID" > "$PID_FILE"

for _ in {1..20}; do
  if curl -fsS "$BRIDGE_URL" >/dev/null 2>&1; then
    if [[ "$restart_needed" == "true" ]]; then
      echo "Runtime bridge restarted on http://127.0.0.1:${BRIDGE_PORT}"
    else
      echo "Runtime bridge started on http://127.0.0.1:${BRIDGE_PORT}"
    fi
    exit 0
  fi
  sleep 0.25
done

echo "Runtime bridge failed to become healthy on port ${BRIDGE_PORT}. Check $LOG_FILE" >&2
exit 1
