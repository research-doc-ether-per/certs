
Issuer API を
Docker + docker-compose + Bash スクリプト で管理・起動するための構成です。

·
├─ Dockerfile            # Issuer API 用 Dockerfile
├─ compose.yml            # 実行定義（healthcheck / security 設定）
├─ config/                # 設定ファイル（read-only mount）
│  ├─ .env
│  ├─ keycloak.json
│  ├─ log4js.json
│  ├─ server.json
│  ├─ vcTemplate.json
│  ├─ walletDB.json
│  └─ waltid.json
└─ runtime/
   └─ logs/               # ログ出力用（writeable）
