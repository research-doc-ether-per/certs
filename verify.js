
### 1.1 `wallets` → `wallet2_wallets`

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `id` | `wallet2_wallets.id` | UUID を文字列に変換（ID は維持） | `uuid NOT NULL` |
| `name` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(128) NOT NULL` |
| `createdOn` | — | 未移行（対応カラムなし、デフォルト値なし） | `timestamp without time zone NOT NULL` |

**`wallet2_wallets` 側で旧カラムから値が設定されないカラム**

| v1.0.0 カラム | 移行後の値 | 理由 |
|---|---|---|
| `static_key` | `NULL` | `text`、移行コードから値を設定しない |
| `crypto2_static_key` | `NULL` | `text`、移行コードから値を設定しない |
| `static_did` | `NULL` | `varchar(1024)`、移行コードから値を設定しない |
| `default_key_id` | 旧 `wallet_dids."keyId"` | `wallet_dids."default" = true` の場合、関連する Key ID を設定。該当なしの場合は `NULL` |
| `default_did_id` | 旧 `wallet_dids.did` | `wallet_dids."default" = true` の場合、デフォルト DID を設定。該当なしの場合は `NULL` |
