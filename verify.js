| ファイル | 内容 |
|---|---|
| `config/config.json` | 移行対象のテーブル名、列名、および値の変換ルールを定義します。 |
| `config/db.json` | PostgreSQL の接続情報を定義します。 |
| `config/waltid.json` | walt.id v1.0.0 の接続先情報を定義します。 |
| `services/postgres_service.js` | DB 接続、SQL 実行、トランザクション管理、通常列の値の更新・件数集計、JSON/TEXT 列の取得・更新を行います。 |
| `services/json_migration_service.js` | JSON/TEXT 列の値の解析、変換前後の比較、および変更がある場合の更新処理を行います。 |
| `services/waltid/fetch-service.js` | walt.id API へのHTTPリクエストを共通化します。リクエスト送信、レスポンス取得、およびエラー処理を行います。 |
| `services/waltid/issuer2-service.js` | walt.id Issuer2 API を利用するための処理を提供します。Credential Profileの取得など、`vc_info`移行時に必要なIssuer2関連処理を行います。 |
| `migrate_format.js` | `format` 列の値を移行します。 |
| `migrate_authType.js` | `auth_type` 列の値を移行します。 |
| `migrate_vc_info.js` | `vc_info` 列の値を取得・解析し、必要に応じてwalt.id Issuer2のCredential Profileを参照して移行します。 |
| `migrate_vp_info.js` | `vp_info` 列の値を取得・解析し、必要に応じて移行します。 |
| `migrate_fields.js` | `credential_formats.fields` などの値を取得・解析し、必要に応じて移行します。 |
| `migrate_wallet_data.js` | Account・Wallet・DID関連情報をwalt.idからCloud Walletへ移行し、`priv_wallets`の構造変更および関連データの移行を行います。 |
| `package.json` | プロジェクト情報と必要な依存パッケージを定義します。 |
| `README.md` | 本Migrationツールの構成、設定、実行方法、および各Migration処理の仕様を記載します。 |
