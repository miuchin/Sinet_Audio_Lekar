#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$BASE_DIR/projects.json"
README_FILE="$BASE_DIR/README_SINET_CONTROL_CENTER_v1.md"

need_cmd(){ command -v "$1" >/dev/null 2>&1 || { echo "Nedostaje komanda: $1"; exit 1; }; }
need_cmd python3

json_query(){
  python3 - "$CONFIG_FILE" "$1" "$2" <<'PY'
import json, sys
cfg = json.load(open(sys.argv[1], encoding='utf-8'))
project_id = sys.argv[2]
field = sys.argv[3]
for p in cfg.get('projects', []):
    if p.get('id') == project_id:
        print(p.get(field, ''))
        break
PY
}

list_projects(){
  python3 - "$CONFIG_FILE" <<'PY'
import json, sys
cfg = json.load(open(sys.argv[1], encoding='utf-8'))
for p in cfg.get('projects', []):
    print(f"{p.get('id')}|{p.get('name')}")
PY
}

run_in_terminal() {
  local cmd="$1"
  if command -v x-terminal-emulator >/dev/null 2>&1; then
    x-terminal-emulator -e bash -lc "$cmd; echo; read -n 1 -s -r -p 'Pritisni bilo koji taster za zatvaranje...'"
  elif command -v konsole >/dev/null 2>&1; then
    konsole -e bash -lc "$cmd; echo; read -n 1 -s -r -p 'Pritisni bilo koji taster za zatvaranje...'"
  elif command -v xfce4-terminal >/dev/null 2>&1; then
    xfce4-terminal --hold -e "bash -lc '$cmd'"
  elif command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal -- bash -lc "$cmd; echo; read -n 1 -s -r -p 'Pritisni bilo koji taster za zatvaranje...'"
  else
    bash -lc "$cmd"
  fi
}

open_path() { command -v xdg-open >/dev/null 2>&1 && xdg-open "$1" >/dev/null 2>&1 || true; }

backup_project(){
  local project_id="$1"
  local project_name project_path prefix target_dir out
  project_name="$(json_query "$project_id" name)"
  project_path="$(json_query "$project_id" path)"
  prefix="$(json_query "$project_id" backup_name_prefix)"
  [[ -d "$project_path" ]] || { echo "Folder ne postoji: $project_path"; return 1; }
  target_dir="$HOME/Downloads/SINET_Backups"
  mkdir -p "$target_dir"
  out="$target_dir/${prefix}_$(date '+%Y-%m-%d_%H-%M').zip"
  (cd "$(dirname "$project_path")" && zip -qr "$out" "$(basename "$project_path")")
  echo "Backup kreiran: $out"
  open_path "$target_dir"
}

choose_project(){
  local rows=()
  while IFS='|' read -r id name; do
    rows+=("$id" "$name")
  done < <(list_projects)

  if command -v zenity >/dev/null 2>&1; then
    zenity --list --title="SINET Control Center — Projekti" --width=560 --height=360 \
      --column="ID" --column="Projekat" "${rows[@]}"
  else
    echo "=== Projekti ===" >&2
    local i=1 ids=()
    while IFS='|' read -r id name; do
      echo "$i) $name [$id]" >&2
      ids+=("$id")
      i=$((i+1))
    done < <(list_projects)
    read -rp "Izaberi projekat [1-$((i-1))]: " ans >&2
    [[ "$ans" =~ ^[0-9]+$ ]] || exit 0
    local idx=$((ans-1))
    echo "${ids[$idx]:-}"
  fi
}

action_menu(){
  local project_id="$1"
  local project_name="$(json_query "$project_id" name)"
  if command -v zenity >/dev/null 2>&1; then
    zenity --list --title="SINET Control Center — $project_name" --width=620 --height=480 \
      --column="Akcija" --column="Opis" \
      "Open folder" "Otvori radni folder projekta" \
      "Start local" "Pokreni lokalni server/komandu iz konfiguracije" \
      "Git init" "Pokreni init skriptu za GitHub" \
      "Git publish" "Pokreni publish skriptu" \
      "Backup" "Napraviće ZIP backup projekta" \
      "Open GitHub" "Otvori GitHub adresu" \
      "Open Netlify" "Otvori Netlify adresu" \
      "Open README" "Otvori Control Center README" \
      "Back" "Nazad"
  else
    echo "=== $project_name ==="
    echo "1) Open folder"
    echo "2) Start local"
    echo "3) Git init"
    echo "4) Git publish"
    echo "5) Backup"
    echo "6) Open GitHub"
    echo "7) Open Netlify"
    echo "8) Open README"
    echo "9) Back"
    read -rp "Izaberi opciju [1-9]: " ans
    case "$ans" in
      1) echo "Open folder" ;;
      2) echo "Start local" ;;
      3) echo "Git init" ;;
      4) echo "Git publish" ;;
      5) echo "Backup" ;;
      6) echo "Open GitHub" ;;
      7) echo "Open Netlify" ;;
      8) echo "Open README" ;;
      *) echo "Back" ;;
    esac
  fi
}


if [[ "${1:-}" == "--backup" ]]; then
  backup_project "${2:-}"
  exit 0
fi

while true; do
  PROJECT_ID="$(choose_project || true)"
  [[ -n "${PROJECT_ID:-}" ]] || exit 0
  while true; do
    ACTION="$(action_menu "$PROJECT_ID" || true)"
    case "$ACTION" in
      "Open folder") open_path "$(json_query "$PROJECT_ID" path)" ;;
      "Start local") run_in_terminal "$(json_query "$PROJECT_ID" start_local_cmd)" ;;
      "Git init") run_in_terminal "cd '$BASE_DIR' && chmod +x '$(json_query "$PROJECT_ID" git_init_script)' && '$(json_query "$PROJECT_ID" git_init_script)'" ;;
      "Git publish") run_in_terminal "cd '$BASE_DIR' && chmod +x '$(json_query "$PROJECT_ID" git_publish_script)' && '$(json_query "$PROJECT_ID" git_publish_script)'" ;;
      "Backup") run_in_terminal "$(printf '%q' "$BASE_DIR/sinet_control_center_manjaro.sh") --backup '$PROJECT_ID'" ;;
      "Open GitHub") [[ -n "$(json_query "$PROJECT_ID" github_url)" ]] && open_path "$(json_query "$PROJECT_ID" github_url)" ;;
      "Open Netlify") [[ -n "$(json_query "$PROJECT_ID" netlify_url)" ]] && open_path "$(json_query "$PROJECT_ID" netlify_url)" ;;
      "Open README") open_path "$README_FILE" ;;
      *) break ;;
    esac
  done
done
