#!/usr/bin/env bash
# env $(grep -v '^#' scripts/proxy.env | xargs) ./scripts/security_scan.sh
set -euo pipefail

######################################
# OSS 脆弱性スキャン
# - Trivy: fs / image（vulnのみ）
# - npm audit: 各 Node.js サービス
######################################

# ===== パス =====
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DOCKER_DIR="${DOCKER_DIR:-$PROJECT_ROOT/docker}"
SERVICES_DIR="${SERVICES_DIR:-$PROJECT_ROOT/services}"
REPORT_DIR="${REPORT_DIR:-$DOCKER_DIR/reports}"

mkdir -p "$REPORT_DIR"

# ===== フラグ =====
USE_TRIVY_FS="${USE_TRIVY_FS:-true}"
USE_TRIVY_IMAGE="${USE_TRIVY_IMAGE:-true}"
USE_NPM_AUDIT="${USE_NPM_AUDIT:-true}"

# ===== Trivy =====
TRIVY_IMAGE="${TRIVY_IMAGE:-aquasec/trivy:latest}"
TRIVY_SEVERITY="${TRIVY_SEVERITY:-HIGH,CRITICAL}"
TRIVY_TIMEOUT="${TRIVY_TIMEOUT:-10m}"

# false: Trivy が自動で DB を更新（通常運用向け）
# true : 事前DBが必要（完全オフライン向け）
TRIVY_OFFLINE="${TRIVY_OFFLINE:-false}"

# Trivy のローカルキャッシュ
TRIVY_CACHE_DIR="${TRIVY_CACHE_DIR:-$DOCKER_DIR/.trivy-cache}"
mkdir -p "$TRIVY_CACHE_DIR"

# DB 取得先（必要なら変更）
# 例: mirror.gcr.io が通らない環境では ghcr.io を使う
TRIVY_DB_REPOSITORY="${TRIVY_DB_REPOSITORY:-ghcr.io/aquasecurity/trivy-db:2}"

# ===== npm audit =====
NPM_AUDIT_LEVEL="${NPM_AUDIT_LEVEL:-high}"

# ===== 固定：Node.js プロジェクト =====
NODE_PROJECT_DIRS=(
  "$SERVICES_DIR/issuer-api"
  "$SERVICES_DIR/issuer-web"
  "$SERVICES_DIR/verifier-api"
  "$SERVICES_DIR/verifier-web"
  "$SERVICES_DIR/wallet-api"
  "$SERVICES_DIR/wallet-web"
)

# ===== 固定：対象イメージ =====
IMAGES=(
  "cloud-issuer-api:latest"
  "cloud-issuer-web:latest"
  "cloud-verifier-api:latest"
  "cloud-wallet-api:latest"
)

# ===== util =====
info() { echo "INFO: $*"; }
warn() { echo "WARN: $*" >&2; }
error() { echo "ERROR: $*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || error "コマンド不足: $1"
}

# Proxy をTrivyコンテナへ引き継ぐ
build_trivy_env_args() {
  local -a envs=()

  [ -n "${HTTP_PROXY:-}"  ]  && envs+=(-e "HTTP_PROXY=$HTTP_PROXY")
  [ -n "${HTTPS_PROXY:-}" ]  && envs+=(-e "HTTPS_PROXY=$HTTPS_PROXY")
  [ -n "${NO_PROXY:-}"    ]  && envs+=(-e "NO_PROXY=$NO_PROXY")

  [ -n "${http_proxy:-}"  ]  && envs+=(-e "http_proxy=$http_proxy")
  [ -n "${https_proxy:-}" ]  && envs+=(-e "https_proxy=$https_proxy")
  [ -n "${no_proxy:-}"    ]  && envs+=(-e "no_proxy=$no_proxy")

  # DB 取得先（必要な場合のみ）
  [ -n "${TRIVY_DB_REPOSITORY:-}" ] && envs+=(-e "TRIVY_DB_REPOSITORY=$TRIVY_DB_REPOSITORY")

  printf '%s\n' "${envs[@]}"
}

# ===== Trivy fs（services）=====
run_trivy_fs_services() {
  [ "$USE_TRIVY_FS" = "true" ] || return 0
  [ -d "$SERVICES_DIR" ] || { warn "services なし: $SERVICES_DIR"; return 0; }

  need_cmd docker

  local offline_args=()
  if [ "$TRIVY_OFFLINE" = "true" ]; then
    offline_args+=(--offline-scan)
  fi

  local -a trivy_env
  mapfile -t trivy_env < <(build_trivy_env_args)

  local date
  date="$(date +"%Y%m%d_%H%M%S")"

  info "Trivy fs: services/"
  docker run --rm \
    "${trivy_env[@]}" \
    -v "$PROJECT_ROOT:/repo:ro" \
    -v "$TRIVY_CACHE_DIR:/root/.cache/trivy" \
    "$TRIVY_IMAGE" fs \
      --timeout "$TRIVY_TIMEOUT" \
      --severity "$TRIVY_SEVERITY" \
      --scanners vuln \
      --format json \
      "${offline_args[@]}" \
      /repo/services \
      > "$REPORT_DIR/trivy_fs_services_${date}.json" || {
        warn "Trivy fs: 検出あり（継続）"
      }
}

# ===== Trivy image（固定）=====
run_trivy_images() {
  [ "$USE_TRIVY_IMAGE" = "true" ] || return 0
  need_cmd docker

  local offline_args=()
  if [ "$TRIVY_OFFLINE" = "true" ]; then
    offline_args+=(--offline-scan)
  fi

  local -a trivy_env
  mapfile -t trivy_env < <(build_trivy_env_args)

  local date
  date="$(date +"%Y%m%d_%H%M%S")"

  for img in "${IMAGES[@]}"; do
    info "Trivy image: $img"
    docker run --rm \
      "${trivy_env[@]}" \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v "$TRIVY_CACHE_DIR:/root/.cache/trivy" \
      "$TRIVY_IMAGE" image \
        --timeout "$TRIVY_TIMEOUT" \
        --severity "$TRIVY_SEVERITY" \
        --scanners vuln \
        --format json \
        "${offline_args[@]}" \
        "$img" \
        > "$REPORT_DIR/trivy_image_$(echo "$img" | tr '/:' '__')_${date}.json" || {
          warn "Trivy image: 検出あり（$img）"
        }
  done
}

# ===== npm audit（固定）=====
run_npm_audit() {
  [ "$USE_NPM_AUDIT" = "true" ] || return 0
  need_cmd npm

  local date
  date="$(date +"%Y%m%d_%H%M%S")"

  info "npm audit: 固定プロジェクト"
  for dir in "${NODE_PROJECT_DIRS[@]}"; do
    if [ ! -f "$dir/package.json" ]; then
      warn "skip (no package.json): $dir"
      continue
    fi

    local name
    name="$(basename "$dir")"
    info "npm audit: $name"

    (
      cd "$dir" || exit 1
      npm audit --audit-level="$NPM_AUDIT_LEVEL" --json \
        > "$REPORT_DIR/npm_audit_${name}_${date}.json" \
        || warn "npm audit: 脆弱性あり（$name）"
    )
  done
}

# ===== main =====
main() {
  local date
  date="$(date +"%Y%m%d_%H%M%S")"

  info "=== OSS scan start: $date ==="
  info "report: $REPORT_DIR"

  run_trivy_fs_services
  run_trivy_images
  run_npm_audit

  info "=== OSS scan end ==="
}

main "$@"
