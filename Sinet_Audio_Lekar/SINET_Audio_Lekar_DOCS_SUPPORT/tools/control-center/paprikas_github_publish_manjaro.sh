#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="Paprikas Hub"
PROJECT_DIR="/home/miuchins/Desktop/SINET/paprikas-Hub"
DEFAULT_BRANCH="main"
FORCE_PUSH="false"
COMMIT_MSG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE_PUSH="true"; shift ;;
    -m|--message) COMMIT_MSG="${2:-}"; shift 2 ;;
    *) echo "Nepoznata opcija: $1"; exit 1 ;;
  esac
done

command -v git >/dev/null 2>&1 || { echo "Git nije instaliran."; exit 1; }
[[ -d "$PROJECT_DIR" ]] || { echo "Folder ne postoji: $PROJECT_DIR"; exit 1; }
cd "$PROJECT_DIR"
[[ -d .git ]] || { echo "Ovaj folder još nije git repo. Pokreni init skriptu prvo."; exit 1; }

if [[ -z "$COMMIT_MSG" ]]; then
  COMMIT_MSG="$PROJECT_NAME update $(date '+%Y-%m-%d %H:%M')"
fi

git add -A
if git diff --cached --quiet; then
  echo "Nema promena za publish."
  exit 0
fi

git commit -m "$COMMIT_MSG"
if [[ "$FORCE_PUSH" == "true" ]]; then
  git push -u origin "$DEFAULT_BRANCH" --force
else
  git push -u origin "$DEFAULT_BRANCH"
fi

echo "Publish završen."
git status
