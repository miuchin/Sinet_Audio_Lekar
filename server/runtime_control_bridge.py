#!/usr/bin/env python3
import json, os, pathlib, socket, subprocess, sys, time
from http.server import BaseHTTPRequestHandler, HTTPServer
ROOT = pathlib.Path(__file__).resolve().parents[1]
SERVER_DIR = ROOT / "server"
RUN_DIR = SERVER_DIR / "run"
LOG_DIR = SERVER_DIR / "logs"
RUN_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)
CONFIG_PATH = SERVER_DIR / "runtime.config.json"
BRIDGE_PID = RUN_DIR / "bridge.pid"
SERVER_PID = RUN_DIR / "server.pid"
def load_cfg():
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
def save_cfg(cfg):
    CONFIG_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
def is_port_open(port):
    s = socket.socket(); s.settimeout(0.25)
    try:
        s.connect(("127.0.0.1", int(port))); s.close(); return True
    except Exception:
        return False
def read_pid(path):
    try: return int(path.read_text().strip())
    except Exception: return None
def is_pid_running(pid):
    try: os.kill(pid,0); return True
    except Exception: return False
def write_pid(path,pid):
    path.write_text(str(pid), encoding='utf-8')
def stop_pid_file(path):
    pid = read_pid(path)
    if pid and is_pid_running(pid):
        try: os.kill(pid,15); time.sleep(0.4)
        except Exception: pass
        if is_pid_running(pid):
            try: os.kill(pid,9)
            except Exception: pass
    try: path.unlink()
    except Exception: pass
def start_static_server():
    cfg = load_cfg(); port = int(cfg['server_port'])
    if is_port_open(port): return {'ok':True,'already_running':True,'port':port}
    log = open(LOG_DIR / 'static_server.log', 'a', encoding='utf-8')
    proc = subprocess.Popen([sys.executable, str(SERVER_DIR / 'static_server.py'), str(port)], cwd=str(ROOT), stdout=log, stderr=log, start_new_session=True)
    write_pid(SERVER_PID, proc.pid)
    for _ in range(25):
        if is_port_open(port): return {'ok':True,'started':True,'port':port,'pid':proc.pid}
        time.sleep(0.2)
    return {'ok':False,'error':f'Server nije startovan na portu {port}.'}
def stop_static_server():
    stop_pid_file(SERVER_PID); return {'ok':True}
def suggest_ports():
    cfg = load_cfg(); start = int(cfg.get('port_range_start',8130)); end = int(cfg.get('port_range_end',8180)); suggestions=[]
    for port in range(start, end):
        bridge = port + 1
        if bridge > end: break
        if not is_port_open(port) and not is_port_open(bridge): suggestions.append({'server_port':port,'bridge_port':bridge})
        if len(suggestions) >= 5: break
    return {'ok':True,'suggestions':suggestions}
class Handler(BaseHTTPRequestHandler):
    def _send(self,payload,status=200):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        self.send_header('Access-Control-Allow-Origin','*')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers(); self.wfile.write(body)
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin','*')
        self.send_header('Access-Control-Allow-Methods','GET,POST,OPTIONS')
        self.send_header('Access-Control-Allow-Headers','Content-Type')
        self.end_headers()
    def do_GET(self):
        cfg = load_cfg()
        if self.path.startswith('/api/health'): return self._send({'ok':True,'service':'sinet-runtime-bridge','bridge_port':cfg['bridge_port']})
        if self.path.startswith('/api/status'):
            return self._send({'ok':True,'project_name':cfg['project_name'],'server_port':cfg['server_port'],'bridge_port':cfg['bridge_port'],'server_running':is_port_open(cfg['server_port']),'bridge_running':True,'app_url':f"http://127.0.0.1:{cfg['server_port']}/{cfg['app_entry']}",'server_center_url':f"http://127.0.0.1:{cfg['server_port']}/server/index.html"})
        if self.path.startswith('/api/config'): return self._send({'ok':True,'config':cfg})
        if self.path.startswith('/api/suggest_ports'): return self._send(suggest_ports())
        return self._send({'ok':False,'error':'Not found'},404)
    def do_POST(self):
        length = int(self.headers.get('Content-Length') or '0')
        raw = self.rfile.read(length) if length else b'{}'
        try: data = json.loads(raw.decode('utf-8'))
        except Exception: data = {}
        if self.path.startswith('/api/config'):
            cfg = load_cfg()
            for key in ('server_port','bridge_port','port_range_start','port_range_end','app_entry','project_name'):
                if key in data and data[key] not in (None,''): cfg[key]=data[key]
            save_cfg(cfg); return self._send({'ok':True,'config':cfg})
        if self.path.startswith('/api/start_server'): return self._send(start_static_server())
        if self.path.startswith('/api/stop_server'): return self._send(stop_static_server())
        if self.path.startswith('/api/restart_server'): stop_static_server(); return self._send(start_static_server())
        return self._send({'ok':False,'error':'Not found'},404)
if __name__ == '__main__':
    cfg = load_cfg(); port = int(cfg['bridge_port']); write_pid(BRIDGE_PID, os.getpid())
    print(f"[SINET bridge] http://127.0.0.1:{port}/api/health", flush=True)
    HTTPServer(('127.0.0.1', port), Handler).serve_forever()
