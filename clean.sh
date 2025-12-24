# =====================================================
# 修正版 Dockerfile
# （Dockerコンテナ対策）
# =====================================================


# ① ベースイメージの最小化
# 理由：
# フルイメージだと使わないものも多くて重いため、
# slim 版を使ってサイズを小さくする
FROM node:22-slim


# ⑧ メタデータラベル
# 理由：
# 後で見返したときに、
# どのサービスのイメージか分かるようにするため
LABEL org.opencontainers.image.title="cloud-issuer-api"


# ⑤ 秘密情報をイメージに含めない
# 理由：
# 一度イメージに入れてしまうと後から消すのが大変で、
# うっかり共有された場合の影響も大きいため、
# パスワードや API Key は Dockerfile には書かない
# 起動時に外から渡す運用にする
#
# 例：
#  - docker run -e DB_PASSWORD=xxxx
#  - docker-compose.yml の environment / secrets
#  - Kubernetes Secret
#
# .env はイメージに含めない（.dockerignore で除外）
ENV NODE_ENV=production


# 作業ディレクトリ
WORKDIR /cloud-issuer-api


# ⑦ ADD は使わず COPY のみ使用
# 理由：
# ADD は自動で処理されるケースがあり、
# 何が入ったか分かりづらくなるため、COPY に統一する
COPY ./service/issuer-api ./issuer-api/


# ④ OSS 依存関係の管理
# 理由：
# npm install だと入る依存が変わることがあるため、
# lockfile 通りに入る npm ci を使う
# 本番では devDependencies は使わないので入れない
RUN cd ./issuer-api \
    && npm ci --omit=dev \
    && npm cache clean --force


# ② 最小特権ユーザー
# 理由：
# root のまま動かす必要はなく、
# 何かあったときの影響を減らすため専用ユーザーで実行する
RUN useradd -m -u 10001 appuser
USER appuser


# アプリケーションの待ち受けポート
EXPOSE 6002


# ⑩ bash -c を使わない
# 理由：
# bash 経由で起動するメリットは特になく、
# 止めるときにシグナルが届かないこともあるため、
# 直接 exec 形式で起動する
CMD ["npm", "start"]
