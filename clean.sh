## Docker セキュリティ対応方針

### 1. Dockerfile 内で対応している項目

- 以下の対策は Dockerfile 内で実施しています。
  ```txt
  ① ベースイメージ最小化
  ② 最小特権ユーザー
  ④ 依存関係管理
  ⑤ 秘密情報非含有
  ⑦ COPY の使用
  ⑧ メタデータ付与
  ⑩ exec 形式起動
  ```

#### 対応参照

```docker
# ① ベースイメージの最小化
# 理由：
# フルイメージには不要なツールやライブラリが多く含まれるため、
# slim 版を使用してイメージサイズおよび攻撃面を抑える
FROM node:22-slim


# ⑧ メタデータラベル
# 理由：
# 後で見返したときに、
# どのサービスのイメージか分かるようにするため
LABEL org.opencontainers.image.title="cloud-issuer-api"


# ⑤ 秘密情報をイメージに含めない
# 理由：
# 一度イメージに入れてしまうと後から消すのが大変で、
# 誤って共有・流出した場合の影響が大きいため、
# パスワードや API Key は Dockerfile には記載しない
# 起動時に外から渡す運用にする
#
# 例：
#  - docker run -e DB_PASSWORD=xxxx
#  - docker-compose.yml の environment / secrets
#  - Kubernetes Secret
#
# .env ファイルはイメージに含めない（.dockerignore で除外）
# ※ NODE_ENV は秘密情報ではなく、実行モード指定のため明示
ENV NODE_ENV=production


# 作業ディレクトリ
WORKDIR /cloud-issuer-api


# ⑦ ADD は使わず COPY のみ使用
# 理由：
# ADD は勝手に展開されたりすることがあり、
# 中身が分かりづらくなるため、COPY に統一する
COPY ./service/issuer-api ./issuer-api/


# ④ OSS 依存関係の管理
# 理由：
# npm install は実行タイミングによって依存関係が変わる可能性があるため、
# lockfile 通りにインストールされる npm ci を使用する
# 本番環境では不要な devDependencies は除外する
#
# ※ API / Web のいずれか一方を選択して使用する
#
# ④-1. API 系の場合
RUN cd ./issuer-api \
    && npm ci --omit=dev \
    && npm cache clean --force

# ④-2. Web系の場合
# Next の build は devDependencies を使う構成も多いので、
# まずは lockfile 通りに全部入れて build し、
# 最後に不要な devDependencies を落とす
# RUN cd ./issuer-web \
#   && npm ci \
#   && npm run build \
#   && npm prune --omit=dev \
#   && npm cache clean --force


# ② 最小特権ユーザー
# 理由：
# root のまま動かす必要はなく、
# 何かあったときの影響を減らすため専用ユーザーで実行する
RUN useradd -m -u 10001 appuser
USER appuser


# アプリケーションの公開ポート
EXPOSE 6002


# ⑩ bash -c を使わない
# 理由：
# bash 経由で起動するメリットはなく、
# シグナルが正しくアプリに伝わらないケースを避けるため、
# exec 形式で直接アプリケーションを起動する
CMD ["npm", "start"]
```

### 2. CI/CD・運用ルール側で対応している項目

- 以下のセキュリティ対策については、Dockerfile 単体では実現できない、または Dockerfile に実装すべきではない内容であるため、CI/CD パイプラインおよび運用ルールにて対応しています。

#### 2-1. ③ イメージ署名・検証（MITM 対策）

- 対応方針
  - Dockerfile 単体ではイメージ署名やその検証を行えないため、CI/CD パイプラインまたはレジストリ運用側で対応します。
- 理由
  - Dockerfile にはイメージの中身のみを定義し、作成者の真正性や信頼性については、配布およびデプロイ工程側で管理する方針としています。
- 想定している運用例
  - CI 上でイメージを build / push
  - push 後にイメージ署名を実施（例：cosign）
  - デプロイ時に署名検証を行う

#### 2-2. ⑥ 不変性を確保するためのタグ管理

- 対応方針
  - イメージの再現性と追跡性を確保するため、mutable な `latest` タグは使用しません。
- 理由
  - `latest` を使用すると、実際に動作しているイメージが判別しづらくなり、障害対応やロールバックの際に問題となるためです。
- タグ付け例
```bash
# バージョン固定
cloud-issuer-api:1.2.3
# 日付ベース
cloud-issuer-api:2024-09-15
# Git commit hash ベース
cloud-issuer-api:sha-xxxxxxx
```

#### 2-3. ⑨ マルチステージビルドの扱い

- 対応方針
  - マルチステージビルドはすべてのコンテナに一律で適用せず、コンテナの役割に応じて使い分けています。
- 理由
  - Web 系（ビルド成果物を生成するもの）では効果が高い一方で、実行専用の API や setup コンテナについては、slim イメージの採用と依存関係の整理で十分なケースが多いためです。
- 運用上の判断
  - Web（frontend）：マルチステージを使用
  - API（Node.js 実行専用）：必要に応じて判断
  - setup / init 系：使用しない
  - Keycloak：公式イメージをそのまま利用
