#!/bin/bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "使い方: $0 <command> [image_tag]"
  echo "コマンド: build | start | stop | init | restart | clear | access | sign | verify | start-verified"
  exit 1
fi

COMPOSE_FILE="docker/issuer-api/compose.yml"
SERVICE_NAME="cloud-issuer-api"
IMAGE_NAME="cloud-issuer-api"

# cosign files (key-pair)
COSIGN_DIR="security/cosign"
COSIGN_KEY="${COSIGN_DIR}/cosign.key"
COSIGN_PUB="${COSIGN_DIR}/cosign.pub"
DIGEST_FILE="${COSIGN_DIR}/image.digest"

COMMAND="$1"
IMAGE_TAG="${2:-}"

# tag 未指定なら YYYYMMDD を自動生成
if [ -z "$IMAGE_TAG" ]; then
  IMAGE_TAG="$(date +"%Y%m%d")"
fi

FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

# compose コマンド選択（v2 優先）
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
else
  COMPOSE_CMD="docker-compose"
fi

export IMAGE_TAG
export FULL_IMAGE_NAME

echo "----------------------------------------"
echo "Service : ${SERVICE_NAME}"
echo "Image   : ${FULL_IMAGE_NAME}"
echo "Command : ${COMMAND}"
echo "Compose : ${COMPOSE_CMD}"
echo "----------------------------------------"

ensure_cosign() {
  if ! command -v cosign >/dev/null 2>&1; then
    echo "ERROR: cosign が見つかりません。インストールしてください。"
    exit 1
  fi
}

ensure_cosign_keys() {
  mkdir -p "${COSIGN_DIR}"
  if [ ! -f "${COSIGN_KEY}" ] || [ ! -f "${COSIGN_PUB}" ]; then
    echo "cosign key-pair が見つかりません。生成します（初回のみ）..."
    cosign generate-key-pair --output-key-prefix "${COSIGN_DIR}/cosign"
    echo "作成完了: ${COSIGN_KEY}, ${COSIGN_PUB}"
  fi
}

get_image_digest() {
  # returns sha256:...
  docker inspect --format='{{.Id}}' "${FULL_IMAGE_NAME}"
}

write_digest_file() {
  local digest="$1"
  echo "${digest}" > "${DIGEST_FILE}"
}

read_digest_file() {
  if [ ! -f "${DIGEST_FILE}" ]; then
    echo "ERROR: digest ファイルがありません: ${DIGEST_FILE}"
    echo "先に build してから sign/verify してください。"
    exit 1
  fi
  cat "${DIGEST_FILE}"
}

case "$COMMAND" in
  build)
    echo "${SERVICE_NAME} をビルドしています..."
    docker build \
      -f docker/issuer-api/Dockerfile \
      -t "${FULL_IMAGE_NAME}" \
      .

    digest="$(get_image_digest)"
    write_digest_file "${digest}"

    echo "build 完了: ${FULL_IMAGE_NAME}"
    echo "digest 記録: ${digest} -> ${DIGEST_FILE}"
    ;;

  start)
    echo "${SERVICE_NAME} を起動しています..."
    $COMPOSE_CMD -f "${COMPOSE_FILE}" up -d
    ;;

  stop)
    echo "${SERVICE_NAME} を停止しています..."
    $COMPOSE_CMD -f "${COMPOSE_FILE}" stop
    ;;

  init)
    echo "${SERVICE_NAME} を初期化しています..."
    $COMPOSE_CMD -f "${COMPOSE_FILE}" down -v --remove-orphans
    $COMPOSE_CMD -f "${COMPOSE_FILE}" up -d
    ;;

  restart)
    echo "${SERVICE_NAME} を再起動しています..."
    $COMPOSE_CMD -f "${COMPOSE_FILE}" stop
    $COMPOSE_CMD -f "${COMPOSE_FILE}" up -d
    ;;

  clear)
    echo "${SERVICE_NAME} を削除しています..."
    $COMPOSE_CMD -f "${COMPOSE_FILE}" down -v --remove-orphans
    ;;

  access)
    echo "${SERVICE_NAME} にアクセスします..."
    docker exec -it "${SERVICE_NAME}" /bin/sh
    ;;

  sign)
    ensure_cosign
    ensure_cosign_keys

    # digest は build 時に記録済みを使用（tag 依存を避ける）
    digest="$(read_digest_file)"
    echo "署名対象: ${IMAGE_NAME}@${digest}"

    cosign sign --key "${COSIGN_KEY}" "${IMAGE_NAME}@${digest}"

    echo "署名完了"
    ;;

  verify)
    ensure_cosign
    if [ ! -f "${COSIGN_PUB}" ]; then
      echo "ERROR: 公開鍵がありません: ${COSIGN_PUB}"
      exit 1
    fi

    digest="$(read_digest_file)"
    echo "検証対象: ${IMAGE_NAME}@${digest}"

    cosign verify --key "${COSIGN_PUB}" "${IMAGE_NAME}@${digest}" >/dev/null

    echo "検証OK"
    ;;

  start-verified)
    ensure_cosign
    if [ ! -f "${COSIGN_PUB}" ]; then
      echo "ERROR: 公開鍵がありません: ${COSIGN_PUB}"
      exit 1
    fi

    digest="$(read_digest_file)"
    echo "検証対象: ${IMAGE_NAME}@${digest}"

    cosign verify --key "${COSIGN_PUB}" "${IMAGE_NAME}@${digest}" >/dev/null
    echo "検証OK。digest 固定で起動します。"

    # compose 側で image: ${IMAGE_DIGEST} を使う前提
    export IMAGE_DIGEST="${IMAGE_NAME}@${digest}"
    $COMPOSE_CMD -f "${COMPOSE_FILE}" up -d
    ;;

  *)
    echo "無効なコマンド: ${COMMAND}"
    echo "使用可能なコマンド: build | start | stop | init | restart | clear | access | sign | verify | start-verified"
    exit 1
    ;;
esac

