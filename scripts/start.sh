#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/server/run"
LOG_DIR="$ROOT_DIR/server/logs"
mkdir -p "$RUN_DIR" "$LOG_DIR"
cd "$ROOT_DIR"
if [[ -f "$RUN_DIR/bridge.pid" ]] && kill -0 "$(cat "$RUN_DIR/bridge.pid")" 2>/dev/null; then
  echo "[SINET] Bridge već radi."
else
  nohup python3 server/runtime_control_bridge.py > server/logs/bridge.out.log 2>&1 &
  echo $! > "$RUN_DIR/bridge.pid"
  sleep 1
fi
python3 - <<'PY2'
import json, pathlib, urllib.request
cfg=json.loads(pathlib.Path('server/runtime.config.json').read_text(encoding='utf-8'))
url=f"http://127.0.0.1:{cfg['bridge_port']}/api/start_server"
req=urllib.request.Request(url, data=b'{}', headers={'Content-Type':'application/json'}, method='POST')
try:
    print(urllib.request.urlopen(req, timeout=5).read().decode('utf-8'))
except Exception as e:
    print(f'[SINET] Start server API error: {e}')
print(f"[SINET] App:    http://127.0.0.1:{cfg['server_port']}/")
print(f"[SINET] Center: http://127.0.0.1:{cfg['server_port']}/server/index.html")
PY2
