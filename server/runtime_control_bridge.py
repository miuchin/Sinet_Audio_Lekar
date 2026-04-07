#!/usr/bin/env python3
import base64
import hashlib
import json
import mimetypes
import os
import pathlib
import re
import socket
import subprocess
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

from PIL import Image, ImageOps, ImageFilter
import pytesseract

ROOT = pathlib.Path(__file__).resolve().parents[1]
SERVER_DIR = ROOT / "server"
RUN_DIR = SERVER_DIR / "run"
LOG_DIR = SERVER_DIR / "logs"
RUNTIME_ROOT = (ROOT / "data/runtime").resolve()
RUN_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)
RUNTIME_ROOT.mkdir(parents=True, exist_ok=True)
CONFIG_PATH = SERVER_DIR / "runtime.config.json"
BRIDGE_PID = RUN_DIR / "bridge.pid"
SERVER_PID = RUN_DIR / "server.pid"


def load_cfg():
    return json.loads((ROOT / "server/runtime.config.json").read_text(encoding="utf-8"))


def save_cfg(cfg):
    CONFIG_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def is_port_open(port):
    s = socket.socket()
    s.settimeout(0.25)
    try:
        s.connect(("127.0.0.1", int(port)))
        s.close()
        return True
    except Exception:
        return False


def read_pid(path):
    try:
        return int(path.read_text().strip())
    except Exception:
        return None


def is_pid_running(pid):
    try:
        os.kill(pid, 0)
        return True
    except Exception:
        return False


def write_pid(path, pid):
    path.write_text(str(pid), encoding="utf-8")


def stop_pid_file(path):
    pid = read_pid(path)
    if pid and is_pid_running(pid):
        try:
            os.kill(pid, 15)
            time.sleep(0.4)
        except Exception:
            pass
        if is_pid_running(pid):
            try:
                os.kill(pid, 9)
            except Exception:
                pass
    try:
        path.unlink()
    except Exception:
        pass


def start_static_server():
    cfg = load_cfg()
    port = int(cfg["server_port"])
    if is_port_open(port):
        return {"ok": True, "already_running": True, "port": port}
    log = open(LOG_DIR / "static_server.log", "a", encoding="utf-8")
    proc = subprocess.Popen(
        [sys.executable, str(SERVER_DIR / "static_server.py"), str(port)],
        cwd=str(ROOT),
        stdout=log,
        stderr=log,
        start_new_session=True,
    )
    write_pid(SERVER_PID, proc.pid)
    for _ in range(25):
        if is_port_open(port):
            return {"ok": True, "started": True, "port": port, "pid": proc.pid}
        time.sleep(0.2)
    return {"ok": False, "error": f"Server nije startovan na portu {port}."}


def stop_static_server():
    stop_pid_file(SERVER_PID)
    return {"ok": True}


def suggest_ports():
    cfg = load_cfg()
    start = int(cfg.get("port_range_start", 8130))
    end = int(cfg.get("port_range_end", 8180))
    suggestions = []
    for port in range(start, end):
        bridge = port + 1
        if bridge > end:
            break
        if not is_port_open(port) and not is_port_open(bridge):
            suggestions.append({"server_port": port, "bridge_port": bridge})
        if len(suggestions) >= 5:
            break
    return {"ok": True, "suggestions": suggestions}


def sanitize_filename(name: str) -> str:
    base = re.sub(r"[^A-Za-z0-9._-]+", "_", str(name or "attachment.bin"))
    base = re.sub(r"_+", "_", base).strip("._")
    return base or "attachment.bin"


def ensure_runtime_path(relative_path: str) -> pathlib.Path:
    rel = str(relative_path or "").replace("\\", "/").strip()
    if not rel.startswith("data/runtime/"):
        raise ValueError("Putanja mora biti unutar data/runtime/")
    target = (ROOT / rel).resolve()
    if target != RUNTIME_ROOT and RUNTIME_ROOT not in target.parents:
        raise ValueError("Nevažeća runtime putanja")
    target.parent.mkdir(parents=True, exist_ok=True)
    return target


def write_text_file(relative_path: str, content: str):
    target = ensure_runtime_path(relative_path)
    target.write_text(str(content or ""), encoding="utf-8")
    return target


def write_json_file(relative_path: str, payload):
    target = ensure_runtime_path(relative_path)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return target


def save_attachment(document_id: str, original_name: str, mime_type: str, base64_data: str, subdir: str = "documents"):
    safe_name = sanitize_filename(original_name or f"{document_id}.bin")
    if "." not in safe_name:
        ext = mimetypes.guess_extension(mime_type or "application/octet-stream") or ".bin"
        safe_name = f"{safe_name}{ext}"
    relative_path = f"data/runtime/attachments/{sanitize_filename(subdir)}/{sanitize_filename(document_id)}__{safe_name}"
    target = ensure_runtime_path(relative_path)
    raw = base64.b64decode(base64_data.encode("utf-8"))
    target.write_bytes(raw)
    sha256 = hashlib.sha256(raw).hexdigest()
    cfg = load_cfg()
    file_url = f"http://127.0.0.1:{cfg['server_port']}/{relative_path}"
    return {
        "ok": True,
        "relative_path": relative_path,
        "size_bytes": len(raw),
        "sha256": sha256,
        "file_url": file_url,
    }


def _preprocess_image_for_ocr(image: Image.Image) -> Image.Image:
    img = image.convert('L')
    img = ImageOps.autocontrast(img)
    try:
        img = img.filter(ImageFilter.MedianFilter(size=3))
    except Exception:
        pass
    w, h = img.size
    if max(w, h) < 1800:
        img = img.resize((max(1, w * 2), max(1, h * 2)))
    img = img.point(lambda p: 255 if p > 160 else 0)
    return img


def _run_image_ocr(target: pathlib.Path):
    img = Image.open(target)
    processed = _preprocess_image_for_ocr(img)
    config = '--oem 3 --psm 6'
    text = pytesseract.image_to_string(processed, lang='eng', config=config)
    confidence = None
    try:
        data = pytesseract.image_to_data(processed, lang='eng', config=config, output_type=pytesseract.Output.DICT)
        confs = []
        for raw in data.get('conf', []):
            try:
                val = float(raw)
                if val >= 0:
                    confs.append(val)
            except Exception:
                pass
        if confs:
            confidence = round(sum(confs) / len(confs), 2)
    except Exception:
        confidence = None
    return text.strip(), confidence


def extract_text_from_runtime_file(relative_path: str, mime_type: str = '', filename: str = ''):
    target = ensure_runtime_path(relative_path)
    if not target.exists():
        raise FileNotFoundError(f"Runtime fajl nije pronađen: {relative_path}")
    lower_name = (filename or target.name).lower()
    lower_mime = (mime_type or '').lower()
    suffix = target.suffix.lower()
    text = ''
    mode = 'unsupported'
    confidence = None
    if suffix in {'.txt', '.md', '.json', '.csv', '.html', '.xml'} or any(x in lower_mime for x in ['text/', 'json', 'xml', 'csv', 'html']):
        text = target.read_text(encoding='utf-8', errors='ignore')
        mode = 'plain_text'
    elif suffix == '.pdf' or 'pdf' in lower_mime or lower_name.endswith('.pdf'):
        try:
            from pypdf import PdfReader
            reader = PdfReader(str(target))
            chunks = []
            for page in reader.pages:
                try:
                    chunks.append(page.extract_text() or '')
                except Exception:
                    chunks.append('')
            text = '\n\n'.join(chunks).strip()
            mode = 'pdf_text_extract'
            if not text:
                text = 'PDF je učitan, ali direktni text extract nije vratio sadržaj. Verovatno je u pitanju skenirani PDF; za sada nalepi ručni OCR tekst ili prvo izvezi strane kao slike.'
                mode = 'pdf_scan_manual_required'
        except Exception as exc:
            text = f'PDF extract nije uspeo: {exc}'
            mode = 'pdf_extract_failed'
    elif suffix in {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff'} or lower_mime.startswith('image/'):
        try:
            text, confidence = _run_image_ocr(target)
            if text:
                mode = 'image_tesseract_ocr'
            else:
                text = 'OCR je pokrenut nad slikom, ali nije dobijen čitljiv tekst. Pokušaj bolju fotografiju ili ručno nalepi tekst.'
                mode = 'image_ocr_empty'
        except Exception as exc:
            text = f'Image OCR nije uspeo: {exc}. Nalepi tekst ručno u OCR zonu.'
            mode = 'image_ocr_failed'
    else:
        text = 'Automatski extract za ovaj tip dokumenta trenutno nije podržan. Ručno nalepi tekst u OCR zonu.'
        mode = 'manual_required'
    return {
        'ok': True,
        'mode': mode,
        'relative_path': relative_path,
        'chars': len(text),
        'text': text,
        'confidence': confidence,
    }


class Handler(BaseHTTPRequestHandler):
    def _send(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        cfg = load_cfg()
        if self.path.startswith("/api/health"):
            return self._send({"ok": True, "service": "sinet-runtime-bridge", "bridge_port": cfg["bridge_port"]})
        if self.path.startswith("/api/status"):
            return self._send(
                {
                    "ok": True,
                    "project_name": cfg["project_name"],
                    "server_port": cfg["server_port"],
                    "bridge_port": cfg["bridge_port"],
                    "server_running": is_port_open(cfg["server_port"]),
                    "bridge_running": True,
                    "app_url": f"http://127.0.0.1:{cfg['server_port']}/{cfg['app_entry']}",
                    "server_center_url": f"http://127.0.0.1:{cfg['server_port']}/server/index.html",
                }
            )
        if self.path.startswith("/api/config"):
            return self._send({"ok": True, "config": cfg})
        if self.path.startswith("/api/suggest_ports"):
            return self._send(suggest_ports())
        if self.path.startswith("/api/runtime_storage_status"):
            return self._send(
                {
                    "ok": True,
                    "available": True,
                    "mode": "bridge_disk",
                    "runtime_root": str(RUNTIME_ROOT),
                    "writable": os.access(RUNTIME_ROOT, os.W_OK),
                    "server_port": cfg["server_port"],
                    "bridge_port": cfg["bridge_port"],
                }
            )
        return self._send({"ok": False, "error": "Not found"}, 404)

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or "0")
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8"))
        except Exception:
            data = {}
        if self.path.startswith("/api/config"):
            cfg = load_cfg()
            for key in ("server_port", "bridge_port", "port_range_start", "port_range_end", "app_entry", "project_name"):
                if key in data and data[key] not in (None, ""):
                    cfg[key] = data[key]
            save_cfg(cfg)
            return self._send({"ok": True, "config": cfg})
        if self.path.startswith("/api/start_server"):
            return self._send(start_static_server())
        if self.path.startswith("/api/stop_server"):
            return self._send(stop_static_server())
        if self.path.startswith("/api/restart_server"):
            stop_static_server()
            return self._send(start_static_server())
        if self.path.startswith("/api/runtime/save_attachment"):
            try:
                payload = save_attachment(
                    document_id=str(data.get("document_id") or "doc_unknown"),
                    original_name=str(data.get("original_name") or "attachment.bin"),
                    mime_type=str(data.get("mime_type") or "application/octet-stream"),
                    base64_data=str(data.get("base64_data") or ""),
                    subdir=str(data.get("subdir") or "documents"),
                )
                return self._send(payload)
            except Exception as exc:
                return self._send({"ok": False, "error": str(exc)}, 400)

        if self.path.startswith("/api/runtime/extract_text_from_attachment"):
            try:
                payload = extract_text_from_runtime_file(
                    relative_path=str(data.get("relative_path") or ""),
                    mime_type=str(data.get("mime_type") or ""),
                    filename=str(data.get("filename") or ""),
                )
                return self._send(payload)
            except Exception as exc:
                return self._send({"ok": False, "error": str(exc)}, 400)
        if self.path.startswith("/api/runtime/write_file"):
            try:
                relative_path = str(data.get("relative_path") or "")
                if "json_content" in data:
                    target = write_json_file(relative_path, data.get("json_content"))
                elif "base64_content" in data:
                    target = ensure_runtime_path(relative_path)
                    target.write_bytes(base64.b64decode(str(data.get("base64_content") or "").encode("utf-8")))
                else:
                    target = write_text_file(relative_path, data.get("text_content") or "")
                cfg = load_cfg()
                rel = str(target.relative_to(ROOT)).replace("\\", "/")
                return self._send({
                    "ok": True,
                    "relative_path": rel,
                    "file_url": f"http://127.0.0.1:{cfg['server_port']}/{rel}",
                    "size_bytes": target.stat().st_size,
                })
            except Exception as exc:
                return self._send({"ok": False, "error": str(exc)}, 400)
        return self._send({"ok": False, "error": "Not found"}, 404)


if __name__ == "__main__":
    cfg = load_cfg()
    port = int(cfg["bridge_port"])
    write_pid(BRIDGE_PID, os.getpid())
    print(f"[SINET bridge] http://127.0.0.1:{port}/api/health", flush=True)
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()
