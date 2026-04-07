#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[SKAL CLEAN] Root: $ROOT_DIR"
echo "[SKAL CLEAN] Ova skripta briše NE-radni višak i ostavlja samo runtime knjige."

KEEP=(
  "index.html"
  "SINET_VERSION_ACTIVE.txt"
  "README.md"
  "start.sh"
  "start_windows.bat"
  "css"
  "js"
  "pages"
  "data"
  "tools/clean_project_runtime_only.sh"
)

# zaštita: ne radi van očekivanog root-a
if [[ ! -f "index.html" || ! -d "data" || ! -d "js" ]]; then
  echo "[SKAL CLEAN] Greška: ne izgleda kao root SINET_KNJIGA_AUDIO_LEKAR projekta."
  exit 1
fi

mkdir -p _trash_clean_pack

shopt -s dotglob nullglob
for item in *; do
  skip=0
  for keep in "${KEEP[@]}"; do
    if [[ "$item" == "$keep" ]]; then
      skip=1
      break
    fi
  done
  if [[ $skip -eq 0 ]]; then
    echo "[SKAL CLEAN] Premestam: $item"
    mv "$item" _trash_clean_pack/
  fi
done
shopt -u dotglob nullglob

echo "[SKAL CLEAN] Završeno. Višak je premešten u: $ROOT_DIR/_trash_clean_pack"
