#!/bin/bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "使い方: $0 <command> [image_tag]"
  echo "コマンド: build | start | stop | init | restart | clear | access | sign | verify | start-verified"
  exit 1
fi

WORKSPACE="${HOME}/workspace/cloudcredentialservice"
COMPOSE_FILE="${WORKSPACE}/docker/issuer-api/compose.yml"
SERVICE_NAME="cloud-issuer-api"
IMAGE_NAME="cloud-issuer-api"

# cosign files (key-pair)
COSIGN_DIR="${WORKSPACE}/docker/issuer-api/security/cosign"
COSIGN_KEY="${COSIGN_DIR}/cosign.key"
COSIGN_PUB="${COSIGN_DIR}/cosign.pub"
DIGEST_FILE="${COSIGN_DIR}/image.digest"

cd "${WORKSPACE}"

COMMAND="$1"
IMAGE_TAG="${2:-}"
MODE="${MODE:-local}" # local | registry（本地推荐 local）

# tag 未指定なら YYYYMMDD を自動生成
if [ -z "${IMAGE_TAG}" ]; then
  IMAGE_TAG="$(date +%Y%m%d)"
fi

FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
export FULL_IMAGE_NAME

# docker compose コマンド（v2 推奨）
COMPOSE_CMD="docker compose"

print_header() {
  echo "---------------------------------------------"
  echo "Service : ${SERVICE_NAME}"
  echo "Image   : ${FULL_IMAGE_NAME}"
  echo "Command : ${COMMAND}"
  echo "Compose : ${COMPOSE_CMD}"
  echo "MODE    : ${MODE}"
  echo "---------------------------------------------"
}

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

write_digest_file() {
  local digest="$1"
  mkdir -p "${COSIGN_DIR}"
  echo "${digest}" > "${DIGEST_FILE}"
  echo "digest 記録: ${digest} -> ${DIGEST_FILE}"
}

read_digest_file() {
  if [ ! -f "${DIGEST_FILE}" ]; then
    echo "ERROR: digest ファイルがありません: ${DIGEST_FILE}"
    echo "先に build してから sign/verify してください。"
    exit 1
  fi
  cat "${DIGEST_FILE}"
}

get_local_image_id() {
  # ローカルイメージの ID（sha256:...）を取得
  docker image inspect -f '{{.Id}}' "${FULL_IMAGE_NAME}"
}

case "${COMMAND}" in
  build)
    print_header
    echo "${SERVICE_NAME} をビルドしています..."
    # 例: docker build -f docker/issuer-api/Dockerfile -t cloud-issuer-api:YYYYMMDD .
    docker build -f docker/issuer-api/Dockerfile -t "${FULL_IMAGE_NAME}" .

    # 本地环境：registry digest 不是 RepoDigest（因为没 push）
    # 代替：记录 image ID（sha256:...），用于“可追溯性”
    image_id="$(get_local_image_id)"
    write_digest_file "${image_id}"

    echo "build 完了: ${FULL_IMAGE_NAME}"
    ;;

  start)
    print_header
    echo "${SERVICE_NAME} を起動しています..."
    # FULL_IMAGE_NAME は export 済みなので compose.yml の ${FULL_IMAGE_NAME} に入る
    ${COMPOSE_CMD} -f "${COMPOSE_FILE}" up -d
    ;;

  stop)
    print_header
    echo "${SERVICE_NAME} を停止しています..."
    ${COMPOSE_CMD} -f "${COMPOSE_FILE}" stop
    ;;

  init)
    print_header
    echo "${SERVICE_NAME} を初期化しています（volume 含め削除→再作成）..."
    ${COMPOSE_CMD} -f "${COMPOSE_FILE}" down -v
    ${COMPOSE_CMD} -f "${COMPOSE_FILE}" up -d
    ;;

  restart)
    print_header
    echo "${SERVICE_NAME} を再起動しています..."
    ${COMPOSE_CMD} -f "${COMPOSE_FILE}" restart
    ;;

  clear)
    print_header
    echo "${SERVICE_NAME} を削除しています（コンテナ停止→削除）..."
    ${COMPOSE_CMD} -f "${COMPOSE_FILE}" down
    ;;

  access)
    print_header
    echo "${SERVICE_NAME} にアクセスします..."
    docker exec -it "${SERVICE_NAME}" /bin/sh
    ;;

  sign)
    print_header
    ensure_cosign
    ensure_cosign_keys

    # 本地推荐：docker-daemon: を使う（registry にアクセスしない）
    echo "署名対象: docker-daemon:${FULL_IMAGE_NAME}"
    cosign sign --key "${COSIGN_KEY}" "docker-daemon:${FULL_IMAGE_NAME}"
    echo "署名完了"
    ;;

  verify)
    print_header
    ensure_cosign

    if [ ! -f "${COSIGN_PUB}" ]; then
      echo "ERROR: 公開鍵がありません: ${COSIGN_PUB}"
      exit 1
    fi

    echo "検証対象: docker-daemon:${FULL_IMAGE_NAME}"
    cosign verify --key "${COSIGN_PUB}" "docker-daemon:${FULL_IMAGE_NAME}" >/dev/null
    echo "検証OK"
    ;;

  start-verified)
    print_header
    # 起動前に検証を必須化
    ensure_cosign
    if [ ! -f "${COSIGN_PUB}" ]; then
      echo "ERROR: 公開鍵がありません: ${COSIGN_PUB}"
      exit 1
    fi

    echo "起動前検証: docker-daemon:${FULL_IMAGE_NAME}"
    cosign verify --key "${COSIGN_PUB}" "docker-daemon:${FULL_IMAGE_NAME}" >/dev/null
    echo "検証OK。起動します..."
    ${COMPOSE_CMD} -f "${COMPOSE_FILE}" up -d
    ;;

  *)
    echo "無効なコマンド: ${COMMAND}"
    echo "使用可能なコマンド: build | start | stop | init | restart | clear | access | sign | verify | start-verified"
    exit 1
    ;;
esac
