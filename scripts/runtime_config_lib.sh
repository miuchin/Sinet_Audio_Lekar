#!/usr/bin/env bash

runtime_config_file_path() {
  local root_dir="${1:-}"
  echo "$root_dir/server/runtime.config.json"
}

runtime_read_config_value() {
  local root_dir="${1:-}"
  local key="${2:-}"
  local default_value="${3:-}"
  local config_file
  config_file="$(runtime_config_file_path "$root_dir")"
  python3 - "$config_file" "$key" "$default_value" <<'PY'
import json, sys
from pathlib import Path

config_path = Path(sys.argv[1])
key = sys.argv[2]
default_value = sys.argv[3]

value = default_value
if config_path.exists():
    try:
        data = json.loads(config_path.read_text(encoding="utf-8"))
        raw = data
        for part in key.split("."):
            if isinstance(raw, dict) and part in raw:
                raw = raw[part]
            else:
                raw = default_value
                break
        value = raw
    except Exception:
        value = default_value

if isinstance(value, bool):
    print("true" if value else "false")
else:
    print(value)
PY
}
