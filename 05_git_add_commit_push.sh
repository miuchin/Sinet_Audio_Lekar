#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/miuchins/Desktop/SINET/Sinet_Audio_Lekar"
REMOTE_NAME="origin"
BRANCH="main"
COMMIT_MSG="${1:-Update projekta}"

cd "$PROJECT_DIR"

echo "Dodajem izmene..."
git add -A

echo
echo "Pravim commit..."
if git diff --cached --quiet; then
  echo "Nema novih izmena za commit."
  exit 0
fi

git commit -m "$COMMIT_MSG"

echo
echo "Guram na $REMOTE_NAME/$BRANCH ..."
git push "$REMOTE_NAME" "$BRANCH"

echo
echo "Push zavrsen."
