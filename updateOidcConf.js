# syntax=docker/dockerfile:1.7

############################
# deps stage
############################
FROM node:22.18.0-slim AS deps
ENV NODE_ENV=production
WORKDIR /app/services/issuer-api

RUN npm config set fund false \
 && npm config set audit false

COPY services/issuer-api/package.json ./
COPY services/issuer-api/package-lock.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev


############################
# runtime stage
############################
FROM node:22.18.0-slim AS runtime
ENV NODE_ENV=production

# read_only 運用時に npm のログ出力先を /tmp に寄せる
# （/tmp は compose 側で tmpfs になる前提）
ENV NPM_CONFIG_CACHE=/tmp/.npm

LABEL org.opencontainers.image.title="cloud-issuer-api"

RUN useradd -m -u 10001 appuser

WORKDIR /app/services/issuer-api

# 依存関係（node_modules）
COPY --from=deps --chown=appuser:appuser /app/services/issuer-api/node_modules ./node_modules

# npm start に必要な package.json を必ず含める
COPY --chown=appuser:appuser services/issuer-api/package.json ./package.json

# アプリ本体
COPY --chown=appuser:appuser services/issuer-api/app.js ./app.js
COPY --chown=appuser:appuser services/issuer-api/src ./src
COPY --chown=appuser:appuser services/issuer-api/config ./config

# ログディレクトリ（compose で volume マウントされる想定）
RUN mkdir -p /app/services/issuer-api/logs \
 && chown -R appuser:appuser /app/services/issuer-api/logs

USER appuser

EXPOSE 6002

CMD ["npm", "start"]

