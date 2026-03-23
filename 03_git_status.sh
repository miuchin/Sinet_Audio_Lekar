#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/miuchins/Desktop/SINET/Sinet_Audio_Lekar"
cd "$PROJECT_DIR"

echo "=== FOLDER ==="
pwd

echo
echo "=== REMOTE ==="
git remote -v || true

echo
echo "=== BRANCH ==="
git branch --show-current || true

echo
echo "=== STATUS ==="
git status --short --branch

echo
echo "=== POSLEDNJI COMMIT ==="
git log --oneline -n 5 || true
