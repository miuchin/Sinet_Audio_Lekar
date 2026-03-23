#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/miuchins/Desktop/SINET/Sinet_Audio_Lekar"
REMOTE_NAME="origin"
BRANCH="main"
INTERVAL_SECONDS="${1:-300}"

cd "$PROJECT_DIR"

echo "Auto-sync petlja startovana za: $PROJECT_DIR"
echo "Interval: ${INTERVAL_SECONDS}s"

auto_sync_once() {
  echo
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sync ciklus"
  git fetch "$REMOTE_NAME" || true
  git pull --rebase "$REMOTE_NAME" "$BRANCH" || true
  git add -A
  if git diff --cached --quiet; then
    echo "Nema lokalnih izmena za push."
  else
    git commit -m "Auto-sync: $(date '+%Y-%m-%d %H:%M:%S')" || true
    git push "$REMOTE_NAME" "$BRANCH" || true
  fi
}

while true; do
  auto_sync_once
  sleep "$INTERVAL_SECONDS"
done
