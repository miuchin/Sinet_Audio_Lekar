#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/miuchins/Desktop/SINET/Sinet_Audio_Lekar"
SSH_HOST="git@github.com"

echo "[1/5] Provera git alata..."
command -v git >/dev/null 2>&1 || { echo "Git nije instaliran."; exit 1; }
git --version

echo

echo "[2/5] Provera SSH alata..."
command -v ssh >/dev/null 2>&1 || { echo "SSH nije instaliran."; exit 1; }
ssh -V || true

echo

echo "[3/5] Provera lokalnog repozitorijuma..."
if [ ! -d "$PROJECT_DIR/.git" ]; then
  echo "Folder nije git repo: $PROJECT_DIR"
  exit 1
fi
cd "$PROJECT_DIR"
pwd
git rev-parse --is-inside-work-tree

echo

echo "[4/5] Provera SSH ključeva..."
ls -la ~/.ssh || true
if [ -f ~/.ssh/id_ed25519.pub ]; then
  echo "Pronadjen: ~/.ssh/id_ed25519.pub"
elif [ -f ~/.ssh/id_rsa.pub ]; then
  echo "Pronadjen: ~/.ssh/id_rsa.pub"
else
  echo "Nije pronadjen public key (~/.ssh/id_ed25519.pub ili ~/.ssh/id_rsa.pub)."
  exit 1
fi

echo

echo "[5/5] Test SSH veze ka GitHub-u..."
set +e
ssh -T "$SSH_HOST"
RC=$?
set -e

echo
if [ "$RC" -eq 1 ]; then
  echo "SSH test izgleda dobro. GitHub obicno vraca code 1 uz poruku dobrodoslice."
  exit 0
fi

echo "SSH test exit code: $RC"
exit 0
