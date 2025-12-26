#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------
# 設定（プロジェクトに合わせて変更可）
# ---------------------------------------
COMPOSE_FILE="docker/issuer-api/compose.yml"
SERVICE_NAME="cloud-issuer-api"

# Compose の service 名（compose.yml の services: 配下のキー）
COMPOSE_SERVICE_KEY="issuer-api"

# ローカルのイメージ名（docker build -t で付ける名前）
IMAGE_NAME="cloud-issuer-api"

# cosign 設定
COSIGN_DIR="security/cosign"
COSIGN_KEY="${COSIGN_DIR}/cosign.key"
COSIGN_PUB="${COSIGN_DIR}/cosign.pub"
DIGEST_FILE="${COSIGN_DIR}/image.digest"

# デフォルトは local（ローカル開発想定）
MODE="${MODE:-local}"   # local | registry

# ---------------------------------------
# ユーティリティ
# ---------------------------------------
usage() {
  echo "使い方: $0 <command> [image_tag]"
  echo ""
  echo "command:"
  echo "  build            イメージをビルドし、digest を記録"
  echo "  start            docker compose で起動（tag 指定可）"
  echo "  stop             停止"
  echo "  restart          再起動"
  echo "  init             down -v → up"
  echo "  clear            down -v"
  echo "  access           コンテナに入る"
  echo "  sign             cosign 署名（MODE により local/registry 自動切替）"
  echo "  verify           cosign 検証（MODE により local/registry 自動切替）"
  echo "  start-verified   verify 成功後に起動"
  echo ""
  echo "環境変数:"
  echo "  MODE=local|registry   (default: local)"
  echo ""
  echo "例:"
  echo "  MODE=local   $0 build 20251226"
  echo "  MODE=local   $0 sign  20251226"
  echo "  MODE=local   $0 start-verified 20251226"
  echo ""
  echo "  MODE=registry $0 build 20251226"
  echo "  MODE=registry $0 sign  20251226   # registry へ push 済みが前提"
}

log() {
  echo ""
  echo "----------------------------------------"
  echo "$*"
  echo "----------------------------------------"
}

ensure_dirs() {
  mkdir -p "${COSIGN_DIR}"
}

# IMAGE:TAG の digest を取得して sha256:... を返す
get_local_digest() {
  local ref="$1" # e.g. cloud-issuer-api:20251226
  local d
  d="$(docker image inspect --format '{{index .RepoDigests 0}}' "${ref}" 2>/dev/null || true)"
  if [[ -z "${d}" ]]; then
    # RepoDigests が無い場合（未タグ付け/状況依存）でも ID から digest 相当を取る
    # ただし cosign の registry モードとは別物。ここでは build 後の RepoDigests を推奨。
    echo ""
    return 1
  fi
  # "cloud-issuer-api@sha256:..." から "sha256:..." を抜き出す
  echo "${d#*@}"
}

record_digest() {
  local tag="$1"
  local ref="${IMAGE_NAME}:${tag}"
  local digest
  digest="$(get_local_digest "${ref}")"
  if [[ -z "${digest}" ]]; then
    echo "ERROR: digest を取得できませんでした: ${ref}"
    echo "  - build が成功しているか"
    echo "  - docker image inspect で RepoDigests が付与されているか"
    exit 1
  fi
  echo "${digest}" > "${DIGEST_FILE}"
  echo "build 完了: ${ref}"
  echo "digest 記録: ${digest} -> ${DIGEST_FILE}"
}

read_digest() {
  if [[ ! -f "${DIGEST_FILE}" ]]; then
    echo "ERROR: digest ファイルが存在しません: ${DIGEST_FILE}"
    echo "先に build を実行して digest を記録してください。"
    exit 1
  fi
  cat "${DIGEST_FILE}"
}

# MODE に応じて cosign の対象参照を作る
# local  : IMAGE:TAG
# registry: IMAGE@sha256:...
cosign_target_ref() {
  local tag="$1"
  if [[ "${MODE}" == "local" ]]; then
    echo "${IMAGE_NAME}:${tag}"
  elif [[ "${MODE}" == "registry" ]]; then
    local digest
    digest="$(read_digest)"
    echo "${IMAGE_NAME}@${digest}"
  else
    echo "ERROR: MODE は local または registry を指定してください（現在: ${MODE}）"
    exit 1
  fi
}

# local モードの cosign オプション
# - registry へアクセスしない
# - transparency log へアップロードしない
cosign_local_opts() {
  echo "--tlog-upload=false --allow-insecure-registry"
}

ensure_cosign_keys() {
  ensure_dirs
  if [[ ! -f "${COSIGN_KEY}" || ! -f "${COSIGN_PUB}" ]]; then
    echo "ERROR: cosign 鍵が見つかりません: ${COSIGN_KEY} / ${COSIGN_PUB}"
    echo "以下で作成してください:"
    echo "  cosign generate-key-pair --output-key-prefix ./${COSIGN_DIR}/cosign"
    exit 1
  fi
}

compose_up() {
  local tag="$1"
  # compose.yml 側で image: cloud-issuer-api:${IMAGE_TAG} を使う想定
  IMAGE_TAG="${tag}" docker compose -f "${COMPOSE_FILE}" up -d
}

compose_down() {
  docker compose -f "${COMPOSE_FILE}" down -v
}

compose_stop() {
  docker compose -f "${COMPOSE_FILE}" stop
}

compose_restart() {
  local tag="$1"
  compose_stop
  compose_up "${tag}"
}

compose_access() {
  # compose のコンテナ名が固定ならそれを使ってもOK
  # ここでは service key を優先
  docker compose -f "${COMPOSE_FILE}" exec "${COMPOSE_SERVICE_KEY}" /bin/sh
}

# ---------------------------------------
# メイン
# ---------------------------------------
COMMAND="${1:-}"
IMAGE_TAG="${2:-}"

if [[ -z "${COMMAND}" ]]; then
  usage
  exit 1
fi

# tag 未指定なら "今日の日付" を使いたい場合（任意）
if [[ -z "${IMAGE_TAG}" ]]; then
  IMAGE_TAG="$(date +%Y%m%d)"
fi

case "${COMMAND}" in
  build)
    log "build（MODE=${MODE}）"
    ensure_dirs
    docker build -f docker/issuer-api/Dockerfile -t "${IMAGE_NAME}:${IMAGE_TAG}" .
    record_digest "${IMAGE_TAG}"
    ;;

  start)
    log "start（MODE=${MODE} / tag=${IMAGE_TAG}）"
    compose_up "${IMAGE_TAG}"
    ;;

  stop)
    log "stop"
    compose_stop
    ;;

  restart)
    log "restart（tag=${IMAGE_TAG}）"
    compose_restart "${IMAGE_TAG}"
    ;;

  init)
    log "init（down -v → up）"
    compose_down
    compose_up "${IMAGE_TAG}"
    ;;

  clear)
    log "clear（down -v）"
    compose_down
    ;;

  access)
    log "access"
    compose_access
    ;;

  sign)
    log "cosign sign（MODE=${MODE}）"
    ensure_cosign_keys

    TARGET_REF="$(cosign_target_ref "${IMAGE_TAG}")"
    echo "署名対象: ${TARGET_REF}"

    if [[ "${MODE}" == "local" ]]; then
      # ローカル署名：registry へ行かない
      COSIGN_EXPERIMENTAL=1 cosign sign \
        --key "./${COSIGN_KEY}" \
        $(cosign_local_opts) \
        "${TARGET_REF}"
    else
      # 生产想定：registry + digest
      cosign sign \
        --key "./${COSIGN_KEY}" \
        "${TARGET_REF}"
    fi
    ;;

  verify)
    log "cosign verify（MODE=${MODE}）"
    ensure_cosign_keys

    TARGET_REF="$(cosign_target_ref "${IMAGE_TAG}")"
    echo "検証対象: ${TARGET_REF}"

    if [[ "${MODE}" == "local" ]]; then
      COSIGN_EXPERIMENTAL=1 cosign verify \
        --key "./${COSIGN_PUB}" \
        $(cosign_local_opts) \
        "${TARGET_REF}"
    else
      cosign verify \
        --key "./${COSIGN_PUB}" \
        "${TARGET_REF}"
    fi
    ;;

  start-verified)
    log "verify → start（MODE=${MODE} / tag=${IMAGE_TAG}）"
    "$0" verify "${IMAGE_TAG}"
    "$0" start "${IMAGE_TAG}"
    ;;

  *)
    echo "無効なコマンド: ${COMMAND}"
    usage
    exit 1
    ;;
esac
