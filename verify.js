version: "3.9"

services:
  issuer-api:
    # bash スクリプトから渡される image 名（例: cloud-issuer-api:20251226）
    image: ${FULL_IMAGE_NAME}

    # コンテナ名を固定（運用・ログ確認用）
    container_name: cloud-issuer-api

    # 外部公開ポート
    ports:
      - "6002:6002"

    # 実行時環境変数
    environment:
      NODE_ENV: production

    # 設定ファイル・ログのマウント
    volumes:
      # 環境変数ファイル（読み取り専用）
      - ./config/.env:/app/services/issuer-api/.env:ro

      # 各種設定ファイル（読み取り専用）
      - ./config/keycloak.json:/app/services/issuer-api/config/keycloak.json:ro
      - ./config/log4js.json:/app/services/issuer-api/config/log4js.json:ro
      - ./config/server.json:/app/services/issuer-api/config/server.json:ro
      - ./config/vcTemplate.json:/app/services/issuer-api/config/vcTemplate.json:ro
      - ./config/walletDB.json:/app/services/issuer-api/config/walletDB.json:ro
      - ./config/waltid.json:/app/services/issuer-api/config/waltid.json:ro

      # ログ出力用ディレクトリ（書き込み可）
      - ./runtime/logs:/app/services/issuer-api/logs

    # ルートファイルシステムを読み取り専用にする
    read_only: true

    # 一時ファイル用 tmpfs
    tmpfs:
      - /tmp

    # 特権昇格を禁止
    security_opt:
      - no-new-privileges:true

    # Linux capability をすべて削除
    cap_drop:
      - ALL

    # ヘルスチェック
    # Dockerfile には書かず、実行環境側で管理
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "node -e \"fetch('http://127.0.0.1:6002/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""
        ]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 20s

    # コンテナ再起動ポリシー
    restart: unless-stopped
