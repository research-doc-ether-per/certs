#!/usr/bin/env bash
set -euo pipefail

######################################
# OSS 脆弱性スキャン
# - Trivy: fs / image
# - npm audit: 各 Node.js サービス
######################################

# ===== パス設定 =====
# スクリプト自身の場所
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# プロジェクトルート
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# docker 配下に成果物を集約
DOCKER_DIR="${DOCKER_DIR:-$PROJECT_ROOT/docker}"
SERVICES_DIR="${SERVICES_DIR:-$PROJECT_ROOT/services}"
REPORT_DIR="${REPORT_DIR:-$DOCKER_DIR/reports}"

# レポート用タイムスタンプ
DATE="$(date +"%Y%m%d_%H%M%S")"
mkdir -p "$REPORT_DIR"

# ===== 実行フラグ =====
# 必要に応じて環境変数で無効化可能
USE_TRIVY_FS="${USE_TRIVY_FS:-true}"
USE_TRIVY_IMAGE="${USE_TRIVY_IMAGE:-true}"
USE_NPM_AUDIT="${USE_NPM_AUDIT:-true}"

# ===== Trivy 設定 =====
TRIVY_IMAGE="${TRIVY_IMAGE:-aquasec/trivy:latest}"
TRIVY_SEVERITY="${TRIVY_SEVERITY:-HIGH,CRITICAL}"
TRIVY_TIMEOUT="${TRIVY_TIMEOUT:-10m}"

# true の場合は Trivy をオフラインモードで実行
# false の場合は Trivy が自動的に脆弱性 DB を更新する
TRIVY_OFFLINE="${TRIVY_OFFLINE:-false}"

# Trivy のローカルキャッシュ
TRIVY_CACHE_DIR="${TRIVY_CACHE_DIR:-$DOCKER_DIR/.trivy-cache}"
mkdir -p "$TRIVY_CACHE_DIR"

# ===== npm audit =====
# high / critical のみ対象
NPM_AUDIT_LEVEL="${NPM_AUDIT_LEVEL:-high}"

# ===== 定期実行（--loop 用）=====
LOOP_INTERVAL=0

# ===== 固定：Node.js プロジェクト =====
# 探索は行わず、対象を明示的に固定
NODE_PROJECT_DIRS=(
  "$SERVICES_DIR/issuer-api"
  "$SERVICES_DIR/issuer-web"
  "$SERVICES_DIR/verifier-api"
  "$SERVICES_DIR/verifier-web"
  "$SERVICES_DIR/wallet-api"
  "$SERVICES_DIR/wallet-web"
)

# ===== 固定：対象イメージ =====
# image 名も固定（探索・設定ファイルは使用しない）
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

# 必須コマンド確認
need_cmd() {
  command -v "$1" >/dev/null 2>&1 || error "コマンド不足: $1"
}

# ===== Trivy fs（services 全体）=====
# ソースコード・依存関係・設定を横断的にスキャン
run_trivy_fs_services() {
  [ "$USE_TRIVY_FS" = "true" ] || return 0
  [ -d "$SERVICES_DIR" ] || { warn "services なし: $SERVICES_DIR"; return 0; }

  need_cmd docker

  local offline_args=()
  if [ "$TRIVY_OFFLINE" = "true" ]; then
    offline_args+=(--offline-scan)
  fi

  info "Trivy fs: services/"
  docker run --rm \
    -v "$PROJECT_ROOT:/repo:ro" \
    -v "$TRIVY_CACHE_DIR:/root/.cache/trivy" \
    "$TRIVY_IMAGE" fs \
      --timeout "$TRIVY_TIMEOUT" \
      --severity "$TRIVY_SEVERITY" \
      --scanners vuln,secret,config \
      --format json \
      "${offline_args[@]}" \
      /repo/services \
      > "$REPORT_DIR/trivy_fs_services_${DATE}.json" || {
        # 脆弱性検出時も処理は継続
        warn "Trivy fs: 検出あり（継続）"
      }
}

# ===== Trivy image（固定イメージ）=====
# OS パッケージ・ランタイムの脆弱性検出
run_trivy_images() {
  [ "$USE_TRIVY_IMAGE" = "true" ] || return 0
  need_cmd docker

  local offline_args=()
  if [ "$TRIVY_OFFLINE" = "true" ]; then
    offline_args+=(--offline-scan)
  fi

  for img in "${IMAGES[@]}"; do
    info "Trivy image: $img"

    docker run --rm \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v "$TRIVY_CACHE_DIR:/root/.cache/trivy" \
      "$TRIVY_IMAGE" image \
        --timeout "$TRIVY_TIMEOUT" \
        --severity "$TRIVY_SEVERITY" \
        --scanners vuln,secret,config \
        --format json \
        "${offline_args[@]}" \
        "$img" \
        > "$REPORT_DIR/trivy_image_$(echo "$img" | tr '/:' '__')_${DATE}.json" || {
          warn "Trivy image: 検出あり（$img）"
        }
  done
}

# ===== npm audit（固定プロジェクト）=====
# Node.js 依存関係の公式脆弱性チェック
run_npm_audit() {
  [ "$USE_NPM_AUDIT" = "true" ] || return 0
  need_cmd npm

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
        > "$REPORT_DIR/npm_audit_${name}_${DATE}.json" \
        || warn "npm audit: 脆弱性あり（$name）"
    )
  done
}

# ===== 1回分の実行 =====
run_once() {
  info "=== OSS scan start: $DATE ==="
  info "report: $REPORT_DIR"

  run_trivy_fs_services
  run_trivy_images
  run_npm_audit

  info "=== OSS scan end ==="
}

