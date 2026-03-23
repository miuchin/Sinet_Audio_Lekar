#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/miuchins/Desktop/SINET/Sinet_Audio_Lekar"
REMOTE_NAME="origin"
REMOTE_URL="git@github.com:miuchin/Sinet_Audio_Lekar.git"

cd "$PROJECT_DIR"

echo "Tekuci remote-i:"
git remote -v || true

echo
if git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  echo "Remote '$REMOTE_NAME' postoji -> menjam na SSH URL"
  git remote set-url "$REMOTE_NAME" "$REMOTE_URL"
else
  echo "Remote '$REMOTE_NAME' ne postoji -> dodajem SSH URL"
  git remote add "$REMOTE_NAME" "$REMOTE_URL"
fi

echo
echo "Novi remote-i:"
git remote -v
