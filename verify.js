# syntax=docker/dockerfile:1.7
# ↑ BuildKit を利用するための指定（--mount=type=cache が使用可能）

############################
# deps stage
# 依存関係のみをインストールするステージ
############################
FROM node:22.18.0-slim AS deps

# 実行環境を production に固定
ENV NODE_ENV=production

# issuer-api の作業ディレクトリ
WORKDIR /app/services/issuer-api

# npm の不要なログや監査を無効化（ビルド安定化）
RUN npm config set fund false \
 && npm config set audit false

# 依存関係定義ファイルのみコピー（キャッシュ効率向上）
COPY services/issuer-api/package.json ./
COPY services/issuer-api/package-lock.json ./

# production 依存関係のみインストール
# npm キャッシュを利用してビルド高速化
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev


############################
# runtime stage
# 実行用の最小イメージ
############################
FROM node:22.18.0-slim AS runtime

ENV NODE_ENV=production

# OCI 準拠のメタデータ
LABEL org.opencontainers.image.title="cloud-issuer-api"

# 最小権限ユーザーを作成
# UID を固定することでホスト側 volume と整合性を取る
RUN useradd -m -u 10001 appuser

# 実行時の作業ディレクトリ
WORKDIR /app/services/issuer-api

# production 依存関係をコピー
COPY --from=deps --chown=appuser:appuser \
  /app/services/issuer-api/node_modules ./node_modules

# アプリケーション本体をコピー
COPY --chown=appuser:appuser services/issuer-api/app.js ./app.js
COPY --chown=appuser:appuser services/issuer-api/src ./src
COPY --chown=appuser:appuser services/issuer-api/config ./config

# ログ出力用ディレクトリ
# compose 側で volume マウントされる前提
RUN mkdir -p /app/services/issuer-api/logs \
 && chown -R appuser:appuser /app/services/issuer-api/logs

# root ではなく非特権ユーザーで実行
USER appuser

# アプリケーションが使用するポート
EXPOSE 6002

# アプリケーション起動
CMD ["npm", "start"]
