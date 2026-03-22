#!/usr/bin/env bash
set -Eeuo pipefail

LOCAL_DIR="/home/miuchins/Desktop/SINET/Sinet_Audio_Lekar"
REPO_URL="git@github.com:miuchin/Sinet_Audio_Lekar.git"
BRANCH="main"
COMMIT_PREFIX="Auto sync: SINET Audio Lekar"

log() { printf '[SINET-SYNC] %s\n' "$*"; }
fail() { printf '[SINET-SYNC][ERROR] %s\n' "$*" >&2; exit 1; }

command -v git >/dev/null 2>&1 || fail "git nije instaliran. Na Manjaro: sudo pacman -S git"
command -v ssh >/dev/null 2>&1 || fail "openssh nije instaliran. Na Manjaro: sudo pacman -S openssh"

[[ -d "$LOCAL_DIR" ]] || fail "Folder ne postoji: $LOCAL_DIR"
cd "$LOCAL_DIR"

if [[ ! -d .git ]]; then
  log "Inicijalizujem Git repozitorijum u lokalnom folderu..."
  git init
fi

CURRENT_BRANCH="$(git branch --show-current 2>/dev/null || true)"
if [[ -z "$CURRENT_BRANCH" ]]; then
  git checkout -B "$BRANCH"
elif [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  git checkout "$BRANCH" 2>/dev/null || git checkout -B "$BRANCH"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

if ! git config user.name >/dev/null; then
  git config user.name "Miuchin Svetozar"
fi

if ! git config user.email >/dev/null; then
  git config user.email "smiuchin@gmail.com"
fi

log "Proveravam SSH pristup ka GitHub-u..."
ssh -T git@github.com >/dev/null 2>&1 || true

log "Dodajem sve izmene..."
git add -A

if git diff --cached --quiet; then
  log "Nema promena za commit."
  exit 0
fi

STAMP="$(date '+%Y-%m-%d %H:%M:%S')"
COMMIT_MSG="$COMMIT_PREFIX ($STAMP)"
log "Commit: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

log "Push na origin/$BRANCH ..."
git push -u origin "$BRANCH"

log "Završeno uspešno."
