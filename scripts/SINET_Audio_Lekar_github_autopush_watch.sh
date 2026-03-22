#!/usr/bin/env bash
set -Eeuo pipefail

LOCAL_DIR="/home/miuchins/Desktop/SINET/Sinet_Audio_Lekar"
SYNC_SCRIPT="/home/miuchins/Desktop/SINET/Sinet_Audio_Lekar/scripts/SINET_Audio_Lekar_github_sync_now.sh"
DEBOUNCE_SECONDS=12

log() { printf '[SINET-WATCH] %s\n' "$*"; }
fail() { printf '[SINET-WATCH][ERROR] %s\n' "$*" >&2; exit 1; }

command -v inotifywait >/dev/null 2>&1 || fail "Nedostaje inotifywait. Na Manjaro: sudo pacman -S inotify-tools"
[[ -d "$LOCAL_DIR" ]] || fail "Folder ne postoji: $LOCAL_DIR"
[[ -x "$SYNC_SCRIPT" ]] || fail "Sync skripta nije nađena ili nije izvršna: $SYNC_SCRIPT"

log "Pratim izmene u: $LOCAL_DIR"
log "Debounce: ${DEBOUNCE_SECONDS}s"

LAST_RUN=0

inotifywait -m -r \
  --event modify,create,delete,move,attrib,close_write \
  --format '%w%f %e' \
  --exclude '(^|/)(\.git|node_modules|dist|build)(/|$)|(~$|\.swp$|\.tmp$|\.temp$|\.part$)' \
  "$LOCAL_DIR" | while read -r CHANGED_PATH EVENTS; do
    NOW="$(date +%s)"
    DELTA=$((NOW - LAST_RUN))

    log "Promena: $CHANGED_PATH [$EVENTS]"

    if (( DELTA < DEBOUNCE_SECONDS )); then
      log "Preskačem zbog debounce prozora (${DELTA}s < ${DEBOUNCE_SECONDS}s)."
      continue
    fi

    LAST_RUN="$NOW"
    if "$SYNC_SCRIPT"; then
      log "Auto-push uspešan."
    else
      log "Auto-push nije uspeo. Sledeća promena će pokušati ponovo."
    fi
  done
