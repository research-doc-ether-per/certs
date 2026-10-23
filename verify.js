
#### account_wallet_mapping → wallet_app.account_wallet_permissions

| v0.15.1 カラム | v1.0.0 カラム | 処理 |
|---|---|---|
| `id` | `account_id` | 元のアカウント ID を保持。複合主キー |
| `wallet` | `wallet_id` | 元の Wallet ID を保持。複合主キー |
| `wallet` → `wallets.id` | `wallet_name` | `wallets.name` を取得して保持。該当データがなければ `NULL` |
| `permissions` | `permissions` | 元の値を保持。値がなければ `NULL` |
| `added_on` | `added_on` | 文字列として保持。値がなければ `NULL` |
| `tenant` | — | 移行しない |


  ログイン関連データ確認

データ移行後、src/login-auth-test.js を使用して、移行済みアカウントのログイン関連データを確認します。
