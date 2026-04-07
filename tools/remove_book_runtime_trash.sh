#!/usr/bin/env bash
set -euo pipefail
TARGET_DIR="${1:-.}"
find "$TARGET_DIR" -maxdepth 3 \( -name '_trash_clean_pack' -o -name '*.tmp' -o -name '*.bak' \) -print
