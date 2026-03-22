#!/usr/bin/env bash
set -euo pipefail

ZIP_PATH="${1:-Sinet_Audio_Lekar.zip}"
REPO_DIR="${2:-$HOME/Desktop/SINET/Sinet_Audio_Lekar_repo}"
REPO_URL="${3:-https://github.com/miuchin/Sinet_Audio_Lekar.git}"
BRANCH="${4:-main}"
COMMIT_MSG="${5:-Deploy SINET Audio Lekar from ZIP}"

if [[ ! -f "$ZIP_PATH" ]]; then
  echo "Greška: ZIP nije pronađen: $ZIP_PATH" >&2
  exit 1
fi

for cmd in git unzip rsync; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Greška: nedostaje komanda '$cmd'." >&2
    exit 1
  fi
done

WORKDIR="$(mktemp -d)"
cleanup() {
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

echo "[1/7] Raspakujem ZIP..."
unzip -q "$ZIP_PATH" -d "$WORKDIR/unpacked"

# Pronađi stvarni root sadržaja.
if [[ -d "$WORKDIR/unpacked/Sinet_Audio_Lekar" ]]; then
  SRC_DIR="$WORKDIR/unpacked/Sinet_Audio_Lekar"
else
  # fallback: uzmi prvi direktorijum ili sam unpacked ako je flat
  FIRST_DIR="$(find "$WORKDIR/unpacked" -mindepth 1 -maxdepth 1 -type d | head -n 1 || true)"
  if [[ -n "$FIRST_DIR" ]]; then
    SRC_DIR="$FIRST_DIR"
  else
    SRC_DIR="$WORKDIR/unpacked"
  fi
fi

echo "[2/7] Pripremam lokalni repo..."
if [[ ! -d "$REPO_DIR/.git" ]]; then
  mkdir -p "$(dirname "$REPO_DIR")"
  git clone "$REPO_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"

echo "[3/7] Prebacujem se na granu $BRANCH..."
git fetch origin
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH" "origin/$BRANCH"
fi

echo "[4/7] Povlačim poslednje izmene..."
git pull --ff-only origin "$BRANCH"

echo "[5/7] Sinhronizujem sadržaj iz ZIP-a u repo root..."
rsync -a --delete --exclude='.git/' "$SRC_DIR/" "$REPO_DIR/"

echo "[6/7] Pripremam commit..."
git add -A
if git diff --cached --quiet; then
  echo "Nema izmena za commit. Repo je već usklađen sa ZIP paketom."
  exit 0
fi

git commit -m "$COMMIT_MSG"

echo "[7/7] Push na GitHub..."
git push origin "$BRANCH"

echo
echo "Uspešno: ZIP je prebačen u repo i pushovan na GitHub."
