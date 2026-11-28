#!/usr/bin/env bash
# The storefront origin deploys ITSELF (jyt#2636), like the backend's A1 box.
#
# build-origin-arm64.yml pushes latest-arm64 on every merge to main; the timer
# runs `auto-deploy.sh auto` every 2 minutes and, when that tag points at a
# NEW image: verify signature → pin SF_IMAGE to the digest → restart → wait
# for /api/health → on failure, put the previous image back.
#
# 🔴 Nothing runs unless its cosign signature verifies: signed keylessly by
# build-origin-arm64.yml on refs/heads/main of the storefront repo.
#
# Commands: check | auto | deploy <image-ref>
set -euo pipefail

cd /opt/sf
REPO="ghcr.io/jaal-yantra-textiles/nextjs-starter-medusa"
TAG="$REPO:latest-arm64"
LOG=/opt/sf/deploy.log
SIGNER="https://github.com/Jaal-Yantra-Textiles/nextjs-starter-medusa/.github/workflows/build-origin-arm64.yml@refs/heads/main"
ISSUER="https://token.actions.githubusercontent.com"

log() { echo "$(date -u +%FT%TZ) $*" | tee -a "$LOG"; }

# Optional phone alerts: put NTFY_TOPIC=<topic> in /opt/sf/ntfy.env.
notify() {
  local topic
  topic=$(sed -n 's/^NTFY_TOPIC=//p' /opt/sf/ntfy.env 2>/dev/null || true)
  [ -n "$topic" ] || return 0
  curl -fsS -m 10 -o /dev/null -H "Title: $1" -H "Priority: ${3:-3}" --data-raw "$2" "https://ntfy.sh/$topic" || true
}

current_image() { sed -n 's/^SF_IMAGE=//p' .env 2>/dev/null || true; }
set_image() {
  if grep -qE '^SF_IMAGE=' .env; then sed -i "s|^SF_IMAGE=.*|SF_IMAGE=$1|" .env
  else printf 'SF_IMAGE=%s\n' "$1" >> .env; fi
}
wait_healthy() {
  for _ in $(seq 1 30); do
    curl -fsS -m 5 http://127.0.0.1:8000/api/health >/dev/null 2>&1 && return 0
    sleep 5
  done
  return 1
}
verify_signature() {
  command -v cosign >/dev/null || { log "cosign missing — refusing $1"; return 1; }
  cosign verify --certificate-identity "$SIGNER" --certificate-oidc-issuer "$ISSUER" "$1" >/dev/null 2>>"$LOG"
}

do_deploy() {
  local new="$1" old
  if ! verify_signature "$new"; then
    # The workflow pushes, then signs seconds later: retry next tick.
    log "signature check FAILED for $new — not deployed (will retry)"
    return 2
  fi
  old="$(current_image)"
  log "deploying $new (was ${old:-none})"
  set_image "$new"
  docker compose up -d --remove-orphans >>"$LOG" 2>&1
  if wait_healthy; then
    log "healthy on $new"
    notify "Storefront origin deployed" "${new##*@} is healthy." 2
    docker image prune -f >/dev/null 2>&1 || true
    return 0
  fi
  log "NOT healthy on $new — restoring ${old:-nothing}"
  docker compose logs --tail 80 storefront >>"$LOG" 2>&1 || true
  if [ -n "$old" ]; then
    set_image "$old"
    docker compose up -d --remove-orphans >>"$LOG" 2>&1
    wait_healthy && notify "Storefront origin rolled back" "${new##*@} was unhealthy; previous version restored." 4 \
      || notify "STOREFRONT ORIGIN DOWN" "${new##*@} unhealthy and rollback failed." 5
  fi
  return 1
}

CMD="${1:-}"
case "$CMD" in
  check)
    echo "pinned:  $(current_image)"
    echo "cosign:  $(command -v cosign >/dev/null && echo present || echo missing)"
    docker compose ps --format '{{.Service}} {{.Status}}'
    curl -fsS -m 5 http://127.0.0.1:8000/api/health || echo "health: DOWN"
    ;;
  auto|deploy)
    exec 9>/opt/sf/deploy.lock
    flock -n 9 || { [ "$CMD" = auto ] && exit 0; echo "another deploy is running" >&2; exit 4; }
    if [ "$CMD" = deploy ]; then
      [ -n "${2:-}" ] || { echo "usage: deploy <image-ref>" >&2; exit 2; }
      docker pull -q "$2" >/dev/null
      do_deploy "$(docker image inspect --format '{{index .RepoDigests 0}}' "$2")"; exit $?
    fi
    docker pull -q "$TAG" >/dev/null 2>&1 || exit 0
    latest=$(docker image inspect --format '{{index .RepoDigests 0}}' "$TAG")
    [ "$latest" = "$(current_image)" ] && exit 0
    [ "$latest" = "$(cat /opt/sf/deploy.failed 2>/dev/null || true)" ] && exit 0
    rc=0; do_deploy "$latest" || rc=$?
    case $rc in
      0) rm -f /opt/sf/deploy.failed ;;
      2) exit 1 ;;
      *) echo "$latest" > /opt/sf/deploy.failed; exit 1 ;;
    esac
    ;;
  *) echo "usage: check | auto | deploy <image-ref>" >&2; exit 2 ;;
esac
