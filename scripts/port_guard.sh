#!/usr/bin/env bash
validate_sinet_port(){
  local port="${1:-8120}"
  if ! [[ "$port" =~ ^[0-9]+$ ]]; then
    echo "[SINET] Greška: port mora biti ceo broj u opsegu 8120-8180." >&2
    return 2
  fi
  if (( port < 8120 || port > 8180 )); then
    echo "[SINET] Greška: dozvoljeni portovi su 8120-8180." >&2
    return 2
  fi
  return 0
}
