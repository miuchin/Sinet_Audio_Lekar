#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
python3 - <<'PY'
import json, pathlib, urllib.request
cfg=json.loads(pathlib.Path('server/runtime.config.json').read_text(encoding='utf-8'))
url=f"http://127.0.0.1:{cfg['bridge_port']}/api/stop_server"
req=urllib.request.Request(url, data=b'{}', headers={'Content-Type':'application/json'}, method='POST')
try:
    print(urllib.request.urlopen(req, timeout=5).read().decode('utf-8'))
except Exception as e:
    print(f'[SINET] Stop server API error: {e}')
PY
if [[ -f "server/run/bridge.pid" ]]; then
  PID="$(cat server/run/bridge.pid || true)"
  if [[ -n "${PID:-}" ]] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    sleep 0.4
    kill -9 "$PID" 2>/dev/null || true
  fi
  rm -f server/run/bridge.pid
fi
echo "[SINET] Runtime stop završen."
