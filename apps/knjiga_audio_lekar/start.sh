#!/usr/bin/env bash
set -euo pipefail
PORT="${1:-8130}"
echo "[SINET_KNJIGA_AUDIO_LEKAR] Startujem lokalni server na http://127.0.0.1:${PORT}/"
python3 -m http.server "$PORT"
