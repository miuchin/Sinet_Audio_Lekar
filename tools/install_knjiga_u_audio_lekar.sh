#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "$0")/.." && pwd)/apps/knjiga_audio_lekar"
TARGET_ROOT="${1:-}"

if [[ -z "$TARGET_ROOT" ]]; then
  echo "Upotreba: ./tools/install_knjiga_u_audio_lekar.sh /putanja/do/Audio_Lekar"
  exit 1
fi

mkdir -p "$TARGET_ROOT/apps/knjiga_audio_lekar"
rsync -av --delete "$SOURCE_DIR/" "$TARGET_ROOT/apps/knjiga_audio_lekar/"

echo "[OK] KNJIGA AUDIO LEKAR je instalirana u: $TARGET_ROOT/apps/knjiga_audio_lekar"
