
curl -sSfL https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64 \
  -o cosign
chmod +x cosign
sudo mv cosign /usr/local/bin/


  #!/bin/bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "使い方: $0 <command> [image_tag]"
  echo "コマンド: build | start | stop | init | restart | clear | access"
  exit 1
fi

COMPOSE_FILE="docker/issuer-api/compose.yml"
SERVICE_NAME="cloud-issuer-api"
IMAGE_NAME="cloud-issuer-api"

COMMAND="$1"
IMAGE_TAG="${2:-}"

# tag 未指定なら YYYYMMDD を自動生成
if [ -z "$IMAGE_TAG" ]; then
  IMAGE_TAG="$(date +"%Y%m%d")"
fi

FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

export IMAGE_TAG
export FULL_IMAGE_NAME

# compose コマンド選択（v2 優先）
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
else
  COMPOSE_CMD="docker-compose"
fi

echo "----------------------------------------"
echo "Service : ${SERVICE_NAME}"
echo "Image   : ${FULL_IMAGE_NAME}"
echo "Command : ${COMMAND}"
echo "Compose : ${COMPOSE_CMD}"
echo "----------------------------------------"

case "$COMMAND" in
  build)
    echo "${SERVICE_NAME} をビルドしています..."
    docker build \
      -f docker/issuer-api/Dockerfile \
      -t "${FULL_IMAGE_NAME}" \
      .
    echo "build 完了: ${FULL_IMAGE_NAME}"
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

  *)
    echo "無効なコマンド: ${COMMAND}"
    echo "使用可能なコマンド: build | start | stop | init | restart | clear | access"
    exit 1
    ;;
esac
