#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/miuchins/Desktop/SINET/Sinet_Audio_Lekar"
REMOTE_NAME="origin"
BRANCH="main"

cd "$PROJECT_DIR"

echo "Povlacim najnovije promene sa $REMOTE_NAME/$BRANCH ..."
git fetch "$REMOTE_NAME"
git pull --rebase "$REMOTE_NAME" "$BRANCH"

echo
echo "Zavrseno. Trenutni status:"
git status --short --branch
