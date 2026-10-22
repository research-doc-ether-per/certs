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
