#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="$(pwd)"
PROJECT_NAME="${1:-$(basename "$PROJECT_ROOT")}"
HOST="127.0.0.1"
SERVER_PORT="8120"
BRIDGE_PORT="8121"
PORT_RANGE_START="8120"
PORT_RANGE_END="8180"
APP_ENTRY="index.html"
PYTHON_BIN="${PYTHON_BIN:-python3}"
TS="$(date +%Y%m%d_%H%M%S)"

log(){ printf '[SINET bootstrap] %s\n' "$*"; }
warn(){ printf '[SINET bootstrap][warn] %s\n' "$*" >&2; }
fail(){ printf '[SINET bootstrap][error] %s\n' "$*" >&2; exit 1; }
need_cmd(){ command -v "$1" >/dev/null 2>&1 || fail "Nedostaje komanda: $1"; }
backup(){ [[ -e "$1" ]] && cp -a "$1" "$1.bak.$TS" && warn "Backup: $1.bak.$TS" || true; }

need_cmd "$PYTHON_BIN"
need_cmd chmod
need_cmd mkdir
need_cmd sed

[[ -f "$PROJECT_ROOT/index.html" ]] || fail "Pokreni ovu skriptu iz root foldera projekta gde postoji index.html"

mkdir -p "$PROJECT_ROOT/server/logs" "$PROJECT_ROOT/server/run" "$PROJECT_ROOT/scripts" "$PROJECT_ROOT/docs/support"

backup "$PROJECT_ROOT/server/runtime.config.json"
cat > "$PROJECT_ROOT/server/runtime.config.json" <<EOF
{
  "project_name": "$PROJECT_NAME",
  "host": "$HOST",
  "server_port": $SERVER_PORT,
  "bridge_port": $BRIDGE_PORT,
  "port_range_start": $PORT_RANGE_START,
  "port_range_end": $PORT_RANGE_END,
  "app_entry": "$APP_ENTRY",
  "open_browser_on_start": true,
  "legacy_mode": true,
  "created_at": "$(date -Iseconds)",
  "updated_at": "$(date -Iseconds)"
}
EOF

backup "$PROJECT_ROOT/server/static_server.py"
cat > "$PROJECT_ROOT/server/static_server.py" <<'PY'
#!/usr/bin/env python3
import argparse
import http.server
import os
import socketserver
from functools import partial


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8120)
    parser.add_argument('--root', default='.')
    args = parser.parse_args()

    root = os.path.abspath(args.root)
    handler = partial(http.server.SimpleHTTPRequestHandler, directory=root)

    class ReuseTCPServer(socketserver.TCPServer):
        allow_reuse_address = True

    with ReuseTCPServer((args.host, args.port), handler) as httpd:
        print(f'[static-server] serving {root} on http://{args.host}:{args.port}/', flush=True)
        httpd.serve_forever()


if __name__ == '__main__':
    main()
PY

backup "$PROJECT_ROOT/server/runtime_control_bridge.py"
cat > "$PROJECT_ROOT/server/runtime_control_bridge.py" <<'PY'
#!/usr/bin/env python3
import json
import os
import signal
import socket
import subprocess
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[1]
SERVER_DIR = ROOT / 'server'
RUN_DIR = SERVER_DIR / 'run'
LOG_DIR = SERVER_DIR / 'logs'
CONFIG_PATH = SERVER_DIR / 'runtime.config.json'
PID_PATH = RUN_DIR / 'server.pid'


def load_config():
    return json.loads(CONFIG_PATH.read_text(encoding='utf-8'))


def save_config(cfg):
    cfg['updated_at'] = time.strftime('%Y-%m-%dT%H:%M:%S')
    CONFIG_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding='utf-8')


def can_bind(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind((host, int(port)))
            return True
        except OSError:
            return False


def is_open(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.2)
        return s.connect_ex((host, int(port))) == 0


def suggest_ports(host, start, end):
    out = []
    for server_port in range(int(start), int(end)):
        bridge_port = server_port + 1
        if bridge_port > int(end):
            break
        if can_bind(host, server_port) and can_bind(host, bridge_port):
            out.append({'server_port': server_port, 'bridge_port': bridge_port})
        if len(out) >= 10:
            break
    return out


def read_pid():
    if not PID_PATH.exists():
        return None
    try:
        return int(PID_PATH.read_text(encoding='utf-8').strip())
    except Exception:
        return None


def is_running(pid):
    if not pid:
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def start_server():
    cfg = load_config()
    pid = read_pid()
    if is_running(pid):
        return {'ok': True, 'message': f'server već radi (PID {pid})', 'pid': pid}
    host = cfg.get('host', '127.0.0.1')
    port = int(cfg.get('server_port', 8120))
    if not can_bind(host, port):
        return {'ok': False, 'message': f'Port {port} je zauzet'}
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    RUN_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOG_DIR / 'server.log'
    cmd = [sys.executable, str(SERVER_DIR / 'static_server.py'), '--host', host, '--port', str(port), '--root', str(ROOT)]
    with open(log_file, 'ab') as out:
        proc = subprocess.Popen(cmd, stdout=out, stderr=out, cwd=str(ROOT), start_new_session=True)
    PID_PATH.write_text(str(proc.pid), encoding='utf-8')
    time.sleep(0.35)
    return {'ok': True, 'message': 'server pokrenut', 'pid': proc.pid}


def stop_server():
    pid = read_pid()
    if not is_running(pid):
        PID_PATH.unlink(missing_ok=True)
        return {'ok': True, 'message': 'server već nije radio'}
    try:
        os.killpg(pid, signal.SIGTERM)
    except Exception:
        try:
            os.kill(pid, signal.SIGTERM)
        except Exception:
            return {'ok': False, 'message': f'Ne mogu da ugasim PID {pid}'}
    time.sleep(0.35)
    PID_PATH.unlink(missing_ok=True)
    return {'ok': True, 'message': 'server zaustavljen', 'pid': pid}


def current_status():
    cfg = load_config()
    host = cfg.get('host', '127.0.0.1')
    server_port = int(cfg.get('server_port', 8120))
    bridge_port = int(cfg.get('bridge_port', 8121))
    pid = read_pid()
    running = is_running(pid) and is_open(host, server_port)
    return {
        'ok': True,
        'project_name': cfg.get('project_name', ROOT.name),
        'host': host,
        'server_port': server_port,
        'bridge_port': bridge_port,
        'port_range_start': int(cfg.get('port_range_start', 8120)),
        'port_range_end': int(cfg.get('port_range_end', 8180)),
        'app_entry': cfg.get('app_entry', 'index.html'),
        'server_running': running,
        'server_pid': pid,
        'server_url': f'http://{host}:{server_port}/{cfg.get("app_entry", "index.html")}',
        'server_center_url': f'http://{host}:{server_port}/server/index.html'
    }


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(200, {'ok': True})

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/health':
            return self._send(200, {'ok': True, 'service': 'sinet-runtime-bridge'})
        if parsed.path == '/status':
            return self._send(200, current_status())
        if parsed.path == '/suggest-ports':
            cfg = load_config()
            qs = parse_qs(parsed.query)
            start = int(qs.get('start', [cfg.get('port_range_start', 8120)])[0])
            end = int(qs.get('end', [cfg.get('port_range_end', 8180)])[0])
            return self._send(200, {'ok': True, 'suggestions': suggest_ports(cfg.get('host', '127.0.0.1'), start, end)})
        return self._send(404, {'ok': False, 'message': 'Not found'})

    def do_POST(self):
        parsed = urlparse(self.path)
        raw = self.rfile.read(int(self.headers.get('Content-Length', '0')) or 0)
        try:
            data = json.loads(raw.decode('utf-8') or '{}')
        except Exception:
            data = {}
        if parsed.path == '/save-config':
            cfg = load_config()
            for key in ['project_name', 'host', 'server_port', 'bridge_port', 'port_range_start', 'port_range_end', 'app_entry', 'open_browser_on_start', 'legacy_mode']:
                if key in data:
                    cfg[key] = data[key]
            save_config(cfg)
            return self._send(200, {'ok': True, 'config': cfg})
        if parsed.path == '/start-server':
            return self._send(200, start_server())
        if parsed.path == '/stop-server':
            return self._send(200, stop_server())
        if parsed.path == '/restart-server':
            stop_server()
            return self._send(200, start_server())
        return self._send(404, {'ok': False, 'message': 'Not found'})


def main():
    cfg = load_config()
    host = cfg.get('host', '127.0.0.1')
    port = int(cfg.get('bridge_port', 8121))
    server = ThreadingHTTPServer((host, port), Handler)
    print(f'[runtime-bridge] http://{host}:{port}/health', flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
PY

backup "$PROJECT_ROOT/server/index.html"
cat > "$PROJECT_ROOT/server/index.html" <<'HTML'
<!doctype html>
<html lang="sr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>SINET Server centar</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #f6f8fb; color: #142033; }
    .wrap { max-width: 960px; margin: 0 auto; padding: 12px; }
    .card { background: #fff; border: 1px solid #d9e2ef; border-radius: 16px; padding: 14px; box-shadow: 0 8px 30px rgba(13,26,62,.06); }
    h1 { margin: 0 0 8px; font-size: clamp(22px, 2.6vw, 30px); }
    p { color: #516179; line-height: 1.45; }
    .badge { display:inline-block; padding:8px 12px; border-radius:999px; background:#ecfdf5; color:#166534; border:1px solid #bbf7d0; margin: 0 8px 8px 0; font-weight:700; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    label { display:block; margin-bottom:6px; font-size:14px; color:#4b5a73; }
    input { width:100%; padding:12px 14px; border-radius:12px; border:1px solid #c8d3e1; font-size:16px; }
    .actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:12px; }
    button { border:0; border-radius:12px; padding:12px 16px; font-weight:700; cursor:pointer; }
    .primary { background:#0f766e; color:#fff; }
    .dark { background:#0f172a; color:#fff; }
    .warn { background:#ef4444; color:#fff; }
    pre { white-space:pre-wrap; word-break:break-word; background:#08112f; color:#eff6ff; border-radius:16px; padding:14px; min-height:140px; overflow:auto; }
    @media (max-width: 760px) { .grid { grid-template-columns:1fr; } .wrap{padding:10px;} .card{padding:12px;} }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>SINET Server centar</h1>
      <p>Stabilni glavni ulaz aplikacije ostaje <b>/index.html</b>. Development snapshot fajlovi neka idu u arhivu.</p>
      <div id="badges"></div>
      <div class="grid">
        <div>
          <label for="serverPort">Server port</label>
          <input id="serverPort" type="number" min="1" max="65535" />
        </div>
        <div>
          <label for="bridgePort">Bridge port</label>
          <input id="bridgePort" type="number" min="1" max="65535" />
        </div>
      </div>
      <div class="actions">
        <button id="saveBtn" class="primary">Save config</button>
        <button id="startBtn" class="dark">Start server</button>
        <button id="restartBtn" class="dark">Restart server</button>
        <button id="stopBtn" class="warn">Stop server</button>
        <button id="suggestBtn">Predloži portove</button>
        <button id="openBtn">Open app</button>
      </div>
      <pre id="log">Učitavam status...</pre>
    </div>
  </div>
  <script>
    const qs = new URLSearchParams(location.search);
    const configuredBridge = Number(qs.get('bridge') || 8121);
    const serverPortEl = document.getElementById('serverPort');
    const bridgePortEl = document.getElementById('bridgePort');
    const badgesEl = document.getElementById('badges');
    const logEl = document.getElementById('log');
    let statusData = null;

    function line(msg) {
      logEl.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg + '\n' + logEl.textContent;
    }
    async function jget(url) { const r = await fetch(url); return r.json(); }
    async function jpost(url, data) { const r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data || {})}); return r.json(); }
    function base() { return 'http://127.0.0.1:' + (bridgePortEl.value || configuredBridge); }

    async function refresh() {
      try {
        const data = await jget(base() + '/status');
        statusData = data;
        serverPortEl.value = data.server_port;
        bridgePortEl.value = data.bridge_port;
        badgesEl.innerHTML = '<span class="badge">Bridge dostupan</span><span class="badge">Server: ' + (data.server_running ? 'RUN' : 'STOP') + '</span>';
        line('Status: ' + (data.server_running ? 'RUN' : 'STOP') + ' · ' + data.server_url);
      } catch (e) {
        badgesEl.innerHTML = '<span class="badge" style="background:#fef2f2;color:#991b1b;border-color:#fecaca">Bridge nije dostupan</span>';
        line('Bridge nije dostupan. Pokreni ./start.sh');
      }
    }

    document.getElementById('saveBtn').onclick = async () => {
      const data = await jpost(base() + '/save-config', { server_port: Number(serverPortEl.value), bridge_port: Number(bridgePortEl.value), app_entry: 'index.html' });
      line(data.ok ? 'Config sačuvan.' : 'Greška pri čuvanju config-a.');
    };
    document.getElementById('startBtn').onclick = async () => { const d = await jpost(base() + '/start-server', {}); line(d.message || 'start'); setTimeout(refresh, 500); };
    document.getElementById('restartBtn').onclick = async () => { const d = await jpost(base() + '/restart-server', {}); line(d.message || 'restart'); setTimeout(refresh, 500); };
    document.getElementById('stopBtn').onclick = async () => { const d = await jpost(base() + '/stop-server', {}); line(d.message || 'stop'); setTimeout(refresh, 500); };
    document.getElementById('suggestBtn').onclick = async () => {
      const d = await jget(base() + '/suggest-ports');
      if (d.suggestions && d.suggestions.length) {
        serverPortEl.value = d.suggestions[0].server_port;
        bridgePortEl.value = d.suggestions[0].bridge_port;
        line('Predlog portova: ' + serverPortEl.value + ' / ' + bridgePortEl.value);
      } else line('Nema slobodnih portova u opsegu.');
    };
    document.getElementById('openBtn').onclick = () => {
      const port = serverPortEl.value || 8120;
      window.open('http://127.0.0.1:' + port + '/index.html', '_blank');
    };
    refresh();
  </script>
</body>
</html>
HTML

backup "$PROJECT_ROOT/scripts/start.sh"
cat > "$PROJECT_ROOT/scripts/start.sh" <<'SH'
#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$ROOT/server/runtime.config.json"
PY="${PYTHON_BIN:-python3}"
BRIDGE_PID="$ROOT/server/run/bridge.pid"
mkdir -p "$ROOT/server/logs" "$ROOT/server/run"
read_cfg(){ "$PY" - "$CONFIG" "$1" <<'PY'
import json, sys
from pathlib import Path
cfg = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
print(cfg.get(sys.argv[2], ''))
PY
}
HOST="$(read_cfg host)"
BRIDGE_PORT="$(read_cfg bridge_port)"
SERVER_PORT="$(read_cfg server_port)"
if [[ -f "$BRIDGE_PID" ]] && kill -0 "$(cat "$BRIDGE_PID")" 2>/dev/null; then
  echo "[SINET] Bridge već radi na $HOST:$BRIDGE_PORT"
else
  nohup "$PY" "$ROOT/server/runtime_control_bridge.py" >> "$ROOT/server/logs/bridge.log" 2>&1 &
  echo $! > "$BRIDGE_PID"
  sleep 0.6
  echo "[SINET] Bridge startovan na $HOST:$BRIDGE_PORT"
fi
if command -v curl >/dev/null 2>&1; then
  for _ in 1 2 3 4 5; do
    if curl -fsS "http://$HOST:$BRIDGE_PORT/start-server" -X POST -H 'Content-Type: application/json' -d '{}' >/dev/null 2>&1; then
      break
    fi
    sleep 0.4
  done
fi
echo "[SINET] Otvori aplikaciju: http://$HOST:$SERVER_PORT/index.html"
echo "[SINET] Otvori server centar: http://$HOST:$SERVER_PORT/server/index.html"
SH

backup "$PROJECT_ROOT/scripts/stop.sh"
cat > "$PROJECT_ROOT/scripts/stop.sh" <<'SH'
#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for pidfile in "$ROOT/server/run/server.pid" "$ROOT/server/run/bridge.pid"; do
  if [[ -f "$pidfile" ]]; then
    pid="$(cat "$pidfile")"
    kill "$pid" 2>/dev/null || true
    rm -f "$pidfile"
  fi
done
echo "[SINET] Server i bridge zaustavljeni."
SH

backup "$PROJECT_ROOT/scripts/status.sh"
cat > "$PROJECT_ROOT/scripts/status.sh" <<'SH'
#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$ROOT/server/runtime.config.json"
PY="${PYTHON_BIN:-python3}"
read_cfg(){ "$PY" - "$CONFIG" "$1" <<'PY'
import json, sys
from pathlib import Path
cfg = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
print(cfg.get(sys.argv[2], ''))
PY
}
HOST="$(read_cfg host)"
BRIDGE_PORT="$(read_cfg bridge_port)"
if command -v curl >/dev/null 2>&1; then
  curl -fsS "http://$HOST:$BRIDGE_PORT/status" || echo '{"ok":false,"message":"bridge nije dostupan"}'
else
  echo '{"ok":false,"message":"curl nije dostupan"}'
fi
SH

backup "$PROJECT_ROOT/start.sh"
cat > "$PROJECT_ROOT/start.sh" <<'SH'
#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec "$ROOT/scripts/start.sh"
SH

backup "$PROJECT_ROOT/stop.sh"
cat > "$PROJECT_ROOT/stop.sh" <<'SH'
#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec "$ROOT/scripts/stop.sh"
SH

backup "$PROJECT_ROOT/start_windows.bat"
cat > "$PROJECT_ROOT/start_windows.bat" <<'BAT'
@echo off
cd /d %~dp0
python server\runtime_control_bridge.py
BAT

backup "$PROJECT_ROOT/stop_windows.bat"
cat > "$PROJECT_ROOT/stop_windows.bat" <<'BAT'
@echo off
echo Stop on Windows currently requires Task Manager or custom PID handling.
BAT

backup "$PROJECT_ROOT/docs/support/SINET_Server_Bootstrap_Installed.md"
cat > "$PROJECT_ROOT/docs/support/SINET_Server_Bootstrap_Installed.md" <<'EOF'
# SINET Server Bootstrap Installed

Projekt: **__PROJECT_NAME__**

Instalirani elementi:
- `server/runtime.config.json`
- `server/static_server.py`
- `server/runtime_control_bridge.py`
- `server/index.html`
- `scripts/start.sh`
- `scripts/stop.sh`
- `scripts/status.sh`
- `start.sh`
- `stop.sh`

## Podrazumevani portovi
- Server: `__SERVER_PORT__`
- Bridge: `__BRIDGE_PORT__`
- Opseg: `__PORT_RANGE__`

## Pravilo
Glavni ulaz aplikacije ostaje **`index.html`**. Versioned HTML snapshot fajlovi idu u arhivu, ne kao glavni runtime entry.
EOF
sed -i   -e "s/__PROJECT_NAME__/$PROJECT_NAME/g"   -e "s/__SERVER_PORT__/$SERVER_PORT/g"   -e "s/__BRIDGE_PORT__/$BRIDGE_PORT/g"   -e "s/__PORT_RANGE__/${PORT_RANGE_START}-${PORT_RANGE_END}/g"   "$PROJECT_ROOT/docs/support/SINET_Server_Bootstrap_Installed.md"

chmod +x \
  "$PROJECT_ROOT/server/static_server.py" \
  "$PROJECT_ROOT/server/runtime_control_bridge.py" \
  "$PROJECT_ROOT/scripts/start.sh" \
  "$PROJECT_ROOT/scripts/stop.sh" \
  "$PROJECT_ROOT/scripts/status.sh" \
  "$PROJECT_ROOT/start.sh" \
  "$PROJECT_ROOT/stop.sh"

log "Završeno. Sledeći korak: ./start.sh"

echo "[SINET] Audio Lekar runtime podrazumevano koristi 8130/8131"
