#!/usr/bin/env bash
set -euo pipefail
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="$HOME/Desktop/SINET_Control_Center"
mkdir -p "$TARGET_DIR"
cp "$BASE_DIR"/* "$TARGET_DIR/" 2>/dev/null || true
chmod +x "$TARGET_DIR"/*.sh || true
chmod +x "$TARGET_DIR"/*.desktop || true
printf 'Instalirano u: %s\n' "$TARGET_DIR"
if command -v xdg-open >/dev/null 2>&1; then xdg-open "$TARGET_DIR" >/dev/null 2>&1 || true; fi
