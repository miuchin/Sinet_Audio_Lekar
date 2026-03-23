#!/usr/bin/env bash
set -euo pipefail

if [ -f ~/.ssh/id_ed25519.pub ]; then
  cat ~/.ssh/id_ed25519.pub
elif [ -f ~/.ssh/id_rsa.pub ]; then
  cat ~/.ssh/id_rsa.pub
else
  echo "Nema public SSH kljuca."
  exit 1
fi
