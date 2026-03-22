#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="Paprikas Hub"
PROJECT_DIR="/home/miuchins/Desktop/SINET/paprikas-Hub"
DEFAULT_BRANCH="main"

need_cmd(){ command -v "$1" >/dev/null 2>&1 || { echo "Nedostaje komanda: $1"; exit 1; }; }
need_cmd git

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "Folder ne postoji: $PROJECT_DIR"
  exit 1
fi

cd "$PROJECT_DIR"

echo "=== $PROJECT_NAME :: GitHub init ==="
echo "Folder: $PROJECT_DIR"

read -rp "Git user.name [miuchins]: " GIT_NAME
GIT_NAME=${GIT_NAME:-miuchins}
read -rp "Git user.email: " GIT_EMAIL
if [[ -z "$GIT_EMAIL" ]]; then
  echo "Email je obavezan."
  exit 1
fi
read -rp "GitHub repo URL (https:// ili git@github.com:...): " REMOTE_URL
if [[ -z "$REMOTE_URL" ]]; then
  echo "Repo URL je obavezan."
  exit 1
fi

git config --global user.name "$GIT_NAME"
git config --global user.email "$GIT_EMAIL"

if [[ ! -d .git ]]; then
  git init
fi

git branch -M "$DEFAULT_BRANCH"

if [[ ! -f .gitignore ]]; then
cat > .gitignore <<'GITEOF'
.DS_Store
Thumbs.db
*.log
*.tmp
*.swp
*~
node_modules/
dist/
build/
.cache/
.vscode/
.idea/
__pycache__/
*.pyc
.venv/
venv/
GITEOF
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "Remote origin već postoji: $(git remote get-url origin)"
  read -rp "Da li da ga zamenim novim URL-om? [y/N]: " REPLACE_REMOTE
  if [[ "${REPLACE_REMOTE:-N}" =~ ^[Yy]$ ]]; then
    git remote set-url origin "$REMOTE_URL"
  fi
else
  git remote add origin "$REMOTE_URL"
fi

git add -A
if git diff --cached --quiet; then
  echo "Nema novih izmena za commit."
else
  git commit -m "${PROJECT_NAME} initial GitHub publish"
fi

read -rp "Da li odmah da uradim push na GitHub? [Y/n]: " DO_PUSH
DO_PUSH=${DO_PUSH:-Y}
if [[ "$DO_PUSH" =~ ^[Yy]$ ]]; then
  read -rp "Force push? Ovo pregazi star sadržaj na grani main. [y/N]: " FORCE_PUSH
  if [[ "${FORCE_PUSH:-N}" =~ ^[Yy]$ ]]; then
    git push -u origin "$DEFAULT_BRANCH" --force
  else
    git push -u origin "$DEFAULT_BRANCH"
  fi
fi

echo
echo "Gotovo. Provera:"
git status
git remote -v
