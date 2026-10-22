# walt.id v0.15.1 → v1.0.0：カスタム移行ツール（JavaScript）

公式 `waltid-wallet-migration` で移行しきれない DB の情報を、v1.0.0 の PostgreSQL 上の独立した `wallet_app` スキーマに保存します。


## セットアップ

```bash
cp .env.example .env
npm install
```

`.env` の URL は環境に合わせて変更してください。特に実環境ではパスワードを Git にコミットしないでください。

```bash
# テーブル作成（この操作は DB に書き込みます）
npm run db:init

# トランザクション内で全処理して ROLLBACK（保存しない）
npm run migrate:dry-run

# 実データ移行
npm run migrate

# 元データと JSONB アーカイブの件数・内容を比較
npm run verify
```
