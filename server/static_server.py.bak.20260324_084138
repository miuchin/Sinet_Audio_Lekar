#!/usr/bin/env python3
import http.server, json, pathlib, socketserver, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
CFG = json.loads((ROOT / "server/runtime.config.json").read_text(encoding="utf-8"))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(CFG.get("server_port", 8130))
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True
with ReusableTCPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"[SINET static server] http://127.0.0.1:{PORT}/", flush=True)
    httpd.serve_forever()
