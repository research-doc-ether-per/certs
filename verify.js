#### account_wallet_mapping → wallet_app.account_wallet_permissions

| v0.15.1 カラム | v1.0.0 カラム | 処理 |
|---|---|---|
| `id` | `account_id` | 元のアカウント ID を保持。複合主キー |
| `wallet` | `wallet_id` | 元の Wallet ID を保持。複合主キー |
| `permissions` | `permissions` | 元の値を保持。値がなければ `NULL` |
| `added_on` | `added_on` | 文字列として保持。値がなければ `NULL` |
| `tenant` | — | 移行しない |

#### wallets → wallet_app.account_wallet_permissions

| v0.15.1 カラム | v1.0.0 カラム | 処理 |
|---|---|---|
| `id` | — | `account_wallet_mapping.wallet` と紐付けるために使用 |
| `name` | `wallet_name` | 対応する Wallet 名を保持 |
| `createdOn` | — | 移行しない |
