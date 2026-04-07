#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
python3 - <<'PY'
import json, pathlib, urllib.request
cfg=json.loads(pathlib.Path('server/runtime.config.json').read_text(encoding='utf-8'))
for path in ('api/health','api/status'):
    url=f"http://127.0.0.1:{cfg['bridge_port']}/{path}"
    try:
        print(urllib.request.urlopen(url, timeout=3).read().decode('utf-8'))
    except Exception as e:
        print(f'[SINET] {path} error: {e}')
PY
