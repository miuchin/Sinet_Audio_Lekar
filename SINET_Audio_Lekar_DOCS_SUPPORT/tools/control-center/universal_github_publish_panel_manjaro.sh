#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SINET_INIT="$BASE_DIR/sinet_github_init_manjaro.sh"
SINET_PUBLISH="$BASE_DIR/sinet_github_publish_manjaro.sh"
PAP_INIT="$BASE_DIR/paprikas_github_init_manjaro.sh"
PAP_PUBLISH="$BASE_DIR/paprikas_github_publish_manjaro.sh"
SINET_DIR="/home/miuchins/Desktop/SINET/Koder/GAUDIO/4.0/GitHubPublish/Sinet_Audio_Lekar_(Public Demo)"
PAP_DIR="/home/miuchins/Desktop/SINET/paprikas-Hub"
README_FILE="$BASE_DIR/README_Universal_GitHub_Panel_SINET_Paprikas.md"

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

open_path() {
  local path="$1"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$path" >/dev/null 2>&1 || true
  else
    echo "Nema xdg-open. Putanja: $path"
  fi
}

zenity_menu() {
  local choice
  choice=$(zenity --list --title="SINET / Paprikas GitHub Panel" --width=560 --height=520 \
    --column="Akcija" --column="Opis" \
    "Init SINET GitHub" "Prvo povezivanje SINET foldera sa GitHub repoom" \
    "Publish SINET" "Git add + commit + push za SINET" \
    "Open SINET Folder" "Otvori SINET GitHubPublish folder" \
    "Init Paprikas GitHub" "Prvo povezivanje Paprikas Hub foldera sa GitHub repoom" \
    "Publish Paprikas" "Git add + commit + push za Paprikas" \
    "Open Paprikas Folder" "Otvori Paprikas Hub folder" \
    "Open README" "Otvori uputstvo za ovaj panel" \
    "Exit" "Zatvori panel") || exit 0
  echo "$choice"
}

terminal_menu() {
  echo
  echo "=== SINET / Paprikas GitHub Panel ==="
  echo "1) Init SINET GitHub"
  echo "2) Publish SINET"
  echo "3) Open SINET Folder"
  echo "4) Init Paprikas GitHub"
  echo "5) Publish Paprikas"
  echo "6) Open Paprikas Folder"
  echo "7) Open README"
  echo "8) Exit"
  read -rp "Izaberi opciju [1-8]: " ans
  case "$ans" in
    1) echo "Init SINET GitHub" ;;
    2) echo "Publish SINET" ;;
    3) echo "Open SINET Folder" ;;
    4) echo "Init Paprikas GitHub" ;;
    5) echo "Publish Paprikas" ;;
    6) echo "Open Paprikas Folder" ;;
    7) echo "Open README" ;;
    *) echo "Exit" ;;
  esac
}

while true; do
  if command -v zenity >/dev/null 2>&1; then
    ACTION=$(zenity_menu)
  else
    ACTION=$(terminal_menu)
  fi

  case "$ACTION" in
    "Init SINET GitHub")
      run_in_terminal "chmod +x '$SINET_INIT' && '$SINET_INIT'"
      ;;
    "Publish SINET")
      run_in_terminal "chmod +x '$SINET_PUBLISH' && '$SINET_PUBLISH'"
      ;;
    "Open SINET Folder")
      open_path "$SINET_DIR"
      ;;
    "Init Paprikas GitHub")
      run_in_terminal "chmod +x '$PAP_INIT' && '$PAP_INIT'"
      ;;
    "Publish Paprikas")
      run_in_terminal "chmod +x '$PAP_PUBLISH' && '$PAP_PUBLISH'"
      ;;
    "Open Paprikas Folder")
      open_path "$PAP_DIR"
      ;;
    "Open README")
      open_path "$README_FILE"
      ;;
    *)
      exit 0
      ;;
  esac
done
