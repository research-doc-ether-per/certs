services:
  issuer-web:
    # docker_manager.sh から渡される FULL_IMAGE_NAME を使用
    # 例: cloud-issuer-web:20251226
    image: ${FULL_IMAGE_NAME}

    # コンテナ名固定（運用・ログ確認用）
    container_name: cloud-issuer-web

    # 外部公開ポート
    ports:
      - "6102:6102"

    # 実行時環境変数
    environment:
      NODE_ENV: production
      # read_only 運用時に npm のキャッシュを書き込み不可になりがちなので /tmp へ逃がす
      NPM_CONFIG_CACHE: /tmp/.npm
      # Next.js が runtime でキャッシュ/テンポラリを使う場合に備える（必要に応じて）
      NEXT_TELEMETRY_DISABLED: "1"

    # 設定ファイル・公開ファイルのマウント（読み取り専用）
    volumes:
      - ./config/config.yaml:/app/services/issuer-web/config/config.yaml:ro
      - ./config/keycloak.yaml:/app/services/issuer-web/config/keycloak.yaml:ro
      - ./config/mapping_settings.yaml:/app/services/issuer-web/config/mapping_settings.yaml:ro
      - ./config/server.yaml:/app/services/issuer-web/config/server.yaml:ro

      # public 配下（必要なら）
      - ./public/.well-known:/app/services/issuer-web/public/.well-known:ro
      - ./public/context:/app/services/issuer-web/public/context:ro
      - ./public/dids:/app/services/issuer-web/public/dids:ro
      - ./public/vocab:/app/services/issuer-web/public/vocab:ro

    # ルートファイルシステムを読み取り専用
    read_only: true

    # 一時ファイルは tmpfs（read_only 対策）
    tmpfs:
      - /tmp
      # Next.js が runtime で .next に書くケースがあるため tmpfs 化（これが重要）
      - /app/services/issuer-web/.next

    # 特権昇格禁止
    security_opt:
      - no-new-privileges:true

    # Linux capability を全削除
    cap_drop:
      - ALL

    # 再起動ポリシー
    restart: unless-stopped
----

########################
# build stage
########################
FROM node:22.18.0-slim AS build

ENV NODE_ENV=production
WORKDIR /app/services/issuer-web

# npm の不要なログや監査を無効化（ビルド安定化）
RUN npm config set fund false \
 && npm config set audit false

# 依存関係のインストール（キャッシュ効率を上げる）
COPY services/issuer-web/package.json ./package.json
COPY services/issuer-web/package-lock.json ./package-lock.json

RUN --mount=type=cache,target=/root/.npm \
    npm ci

# アプリ本体をコピーして build（←ここが重要）
COPY services/issuer-web/ ./

# Next.js を想定：production build を生成
RUN npm run build

# 本番では devDependencies 不要なら prune（任意）
RUN npm prune --omit=dev


########################
# runtime stage
########################
FROM node:22.18.0-slim AS runtime

ENV NODE_ENV=production

# read_only 運用時に npm の書き込み先を /tmp に寄せる
ENV NPM_CONFIG_CACHE=/tmp/.npm
ENV NEXT_TELEMETRY_DISABLED=1

# OCI 準拠のメタデータ
LABEL org.opencontainers.image.title="cloud-issuer-web"

# 最小権限ユーザー
RUN useradd -m -u 10001 appuser

WORKDIR /app/services/issuer-web

# build 産物と必要ファイルだけをコピー
# node_modules（productionのみ）
COPY --from=build --chown=appuser:appuser /app/services/issuer-web/node_modules ./node_modules

# Next.js production build（必須）
COPY --from=build --chown=appuser:appuser /app/services/issuer-web/.next ./.next

# public / config / package.json（start に必要）
COPY --from=build --chown=appuser:appuser /app/services/issuer-web/public ./public
COPY --from=build --chown=appuser:appuser /app/services/issuer-web/config ./config
COPY --from=build --chown=appuser:appuser /app/services/issuer-web/package.json ./package.json

# 非特権ユーザー
USER appuser

EXPOSE 6102

# npm start（package.json の start が next start -p 6102 である想定）
CMD ["npm", "start"]
-----
#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="${HOME}/workspace/cloudcredentialservice"
COMPOSE_FILE="${WORKSPACE}/docker/issuer-web/compose.yml"
SERVICE_NAME="cloud-issuer-web"
IMAGE_NAME="cloud-issuer-web"

usage() {
  echo "使い方: $0 <command> [image_tag]"
  echo "command: build | start | stop | restart | logs | access | status | down"
  exit 1
}

if [ $# -lt 1 ]; then
  usage
fi

COMMAND="$1"
IMAGE_TAG="${2:-}"

# tag 未指定なら YYYYMMDD を自動生成
if [ -z "${IMAGE_TAG}" ]; then
  IMAGE_TAG="$(date +%Y%m%d)"
fi

FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
COMPOSE_CMD="docker compose -f ${COMPOSE_FILE}"

cd "${WORKSPACE}"

echo "----------------------------------"
echo "Service : ${SERVICE_NAME}"
echo "Image   : ${FULL_IMAGE_NAME}"
echo "Command : ${COMMAND}"
echo "Compose : ${COMPOSE_CMD}"
echo "----------------------------------"

case "${COMMAND}" in
  build)
    # compose.yml の image は FULL_IMAGE_NAME を使うが、build は Dockerfile を直接指定して行う
    docker build \
      -t "${FULL_IMAGE_NAME}" \
      -f "${WORKSPACE}/docker/issuer-web/Dockerfile" \
      "${WORKSPACE}"
    echo "build 完了: ${FULL_IMAGE_NAME}"
    ;;

  start)
    # FULL_IMAGE_NAME を env として compose に渡す
    FULL_IMAGE_NAME="${FULL_IMAGE_NAME}" ${COMPOSE_CMD} up -d
    echo "start 完了: ${SERVICE_NAME}"
    ;;

  stop)
    ${COMPOSE_CMD} stop
    echo "stop 完了"
    ;;

  restart)
    FULL_IMAGE_NAME="${FULL_IMAGE_NAME}" ${COMPOSE_CMD} down
    FULL_IMAGE_NAME="${FULL_IMAGE_NAME}" ${COMPOSE_CMD} up -d
    echo "restart 完了"
    ;;

  down)
    ${COMPOSE_CMD} down
    echo "down 完了"
    ;;

  logs)
    ${COMPOSE_CMD} logs -f --tail=200
    ;;

  access)
    echo "${SERVICE_NAME} にアクセスします..."
    docker exec -it "${SERVICE_NAME}" /bin/sh
    ;;

  status)
    ${COMPOSE_CMD} ps
    ;;

  *)
    usage
    ;;
esac
