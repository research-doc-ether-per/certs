
# walt.id v0.15.1 → v1.0.0 PostgreSQL データ移行：カラム対応表

> 対象：v0.15.1（17 テーブル／90 カラム）→ v1.0.0（11 テーブル／33 カラム）
> 対象コード：v1.0.0 `waltid-wallet-migration` の `WalletMigration.kt`。元のスキーマ資料に基づくため、運用 DB に変更がある場合は `information_schema.columns` で再確認してください。

## 表記ルール

| 表記 | 意味 |
|---|---|
| `—` | 対応するテーブル／カラムが存在しません。**NULL が保存されたという意味ではありません。** |
| `NULL` | 移行ツールから値が設定されず、新カラムは NULL 許容・DEFAULT 未定義です。 |
| `DEFAULT 0` | 値が設定されない場合、DB の定義により 0 が入ります。 |
| `生成` | 移行プログラムが新たな値を作成します。 |
| `未移行` | 旧テーブルの値は新 DB にコピーされません。 |

**注意：** 移行先にカラムが存在しない場合、「初期値」はありません。旧テーブルの DDL に `DEFAULT false` 等があっても、新スキーマに引き継がれるわけではありません。

## 1. v0.15.1 の全テーブル・全カラム（旧 → 新）

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
| `default_key_id` | `NULL` | `varchar(512)`、移行コードから値を設定しない |
| `default_did_id` | `NULL` | `varchar(1024)`、移行コードから値を設定しない |

### 1.2 `wallet_keys` → `wallet2_keys`

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `wallet` | `wallet2_keys.store_id` | Wallet ID から `wallet-{walletId}-keys` を生成 | `uuid NOT NULL` |
| `kid` | `wallet2_keys.key_id` | 元の値を保持 | `character varying(512) NOT NULL` |
| `document` | `wallet2_keys.serialized_key` | Key JSON をそのまま保存。併せて `key_type` を推定 | `text NOT NULL` |
| `createdOn` | — | 未移行（対応カラムなし、デフォルト値なし） | `timestamp without time zone NOT NULL` |
| `document` | `wallet2_keys.key_type` | JWK の `crv` / `kty` から推定。推定不可の場合は文字列 `unknown`（DB DEFAULT ではない） | `text NOT NULL` |

**`wallet2_keys` 側で旧カラムから値が設定されないカラム**

| v1.0.0 カラム | 移行後の値 | 理由 |
|---|---|---|
| `crypto2_stored_key` | `NULL` | `text`、移行コードから値を設定しない |

### 1.3 `wallet_dids` → `wallet2_dids`

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `wallet` | `wallet2_dids.store_id` | Wallet ID から `wallet-{walletId}-dids` を生成 | `uuid NOT NULL` |
| `did` | `wallet2_dids.did` | 元の値を保持 | `character varying(1024) NOT NULL` |
| `alias` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(1024) NOT NULL` |
| `document` | `wallet2_dids.document` | JSON を解析して再シリアライズ。JSON として解析できない場合は `{"id":"<DID>"}` | `text NOT NULL` |
| `keyId` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(512) NOT NULL` |
| `default` | — | 未移行（対応カラムなし、デフォルト値なし） | `boolean DEFAULT false NOT NULL` |
| `createdOn` | — | 未移行（対応カラムなし、デフォルト値なし） | `timestamp without time zone NOT NULL` |

### 1.4 `credentials` → `wallet2_credentials`

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `wallet` | `wallet2_credentials.store_id` | Wallet ID から `wallet-{walletId}-creds` を生成 | `uuid NOT NULL` |
| `id` | `wallet2_credentials.id` | 元の値を保持 | `character varying(256) NOT NULL` |
| `document` | `wallet2_credentials.serialized_credential` | CredentialParser で解析・変換 | `text NOT NULL` |
| `disclosures` | `wallet2_credentials.serialized_credential` | 値があれば `document~disclosures` を解析 | `text` |
| `added_on` | — | 未移行（対応カラムなし、デフォルト値なし） | `timestamp without time zone NOT NULL` |
| `manifest` | — | 未移行（対応カラムなし、デフォルト値なし） | `text` |
| `deleted_on` | — | 未移行（対応カラムなし、デフォルト値なし） | `timestamp without time zone` |
| `pending` | — | 未移行（対応カラムなし、デフォルト値なし） | `boolean DEFAULT false NOT NULL` |
| `format` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(32) DEFAULT 'jwt_vc_json'::character varying NOT NULL` |
| `added_on`（値は未使用） | `wallet2_credentials.added_at` | 元の日時を引き継がず `Instant.now()` を設定 | `timestamp NOT NULL` |

**`wallet2_credentials` 側で旧カラムから値が設定されないカラム**

| v1.0.0 カラム | 移行後の値 | 理由 |
|---|---|---|
| `label` | `NULL` | `varchar(512)`、移行コードから値を設定しない |
| `metadata` | `NULL` | `text`、移行コードから値を設定しない |

### 1.5 `account_wallet_mapping` → `wallet2_account_wallets`

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `tenant` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(128) DEFAULT ''::character varying NOT NULL` |
| `id` | `wallet2_account_wallets.account_id` | UUID を文字列に変換（Account ID） | `uuid NOT NULL` |
| `wallet` | `wallet2_account_wallets.wallet_id` | UUID を文字列に変換（Wallet ID） | `uuid NOT NULL` |
| `added_on` | — | 未移行（対応カラムなし、デフォルト値なし） | `timestamp without time zone NOT NULL` |
| `permissions` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(32) NOT NULL` |

### 1.6 `accounts` → 対応テーブルなし

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `tenant` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(128) DEFAULT ''::character varying NOT NULL` |
| `id` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `name` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(128)` |
| `email` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(128)` |
| `password` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(200)` |
| `createdOn` | — | 未移行（対応カラムなし、デフォルト値なし） | `timestamp without time zone NOT NULL` |

### 1.7 `category` → 対応テーブルなし

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `id` | — | 未移行（対応カラムなし、デフォルト値なし） | `integer NOT NULL` |
| `wallet` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `name` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(128) NOT NULL` |

### 1.8 `credential_category` → 対応テーブルなし

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `wallet` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `credential` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(256) NOT NULL` |
| `category` | — | 未移行（対応カラムなし、デフォルト値なし） | `integer NOT NULL` |

### 1.9 `entity_name_resolution_cache` → 対応テーブルなし

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `id` | — | 未移行（対応カラムなし、デフォルト値なし） | `integer NOT NULL` |
| `did` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(1024) NOT NULL` |
| `name` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(512)` |
| `timestamp` | — | 未移行（対応カラムなし、デフォルト値なし） | `timestamp without time zone NOT NULL` |

### 1.10 `events` → 対応テーブルなし

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `id` | — | 未移行（対応カラムなし、デフォルト値なし） | `integer NOT NULL` |
| `tenant` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(128) DEFAULT ''::character varying NOT NULL` |
| `originator` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(128) DEFAULT 'unknown'::character varying NOT NULL` |
| `account` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `wallet` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid` |
| `credential` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(256)` |
| `timestamp` | — | 未移行（対応カラムなし、デフォルト値なし） | `timestamp without time zone NOT NULL` |
| `event` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(48) NOT NULL` |
| `action` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(48) NOT NULL` |
| `data` | — | 未移行（対応カラムなし、デフォルト値なし） | `text NOT NULL` |
| `note` | — | 未移行（対応カラムなし、デフォルト値なし） | `text` |

### 1.11 `notifications` → 対応テーブルなし

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `id` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `account` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `wallet` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `is_read` | — | 未移行（対応カラムなし、デフォルト値なし） | `boolean DEFAULT false NOT NULL` |
| `type` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(128) NOT NULL` |
| `added_on` | — | 未移行（対応カラムなし、デフォルト値なし） | `timestamp without time zone NOT NULL` |
| `data` | — | 未移行（対応カラムなし、デフォルト値なし） | `text NOT NULL` |

### 1.12 `oidclogins` → 対応テーブルなし

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `tenant` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(128) DEFAULT ''::character varying NOT NULL` |
| `accountId` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `oidcId` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(256) NOT NULL` |

### 1.13 `wallet_issuers` → 対応テーブルなし

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `id` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `wallet` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `did` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(1024) NOT NULL` |
| `description` | — | 未移行（対応カラムなし、デフォルト値なし） | `text DEFAULT 'no description'::text` |
| `ui` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(128) NOT NULL` |
| `configuration` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(256) NOT NULL` |
| `authorized` | — | 未移行（対応カラムなし、デフォルト値なし） | `boolean DEFAULT false NOT NULL` |

### 1.14 `wallet_operation_histories` → 対応テーブルなし

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `id` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `tenant` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(128) DEFAULT ''::character varying NOT NULL` |
| `accountId` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `wallet` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `timestamp` | — | 未移行（対応カラムなし、デフォルト値なし） | `timestamp without time zone NOT NULL` |
| `operation` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(48) NOT NULL` |
| `data` | — | 未移行（対応カラムなし、デフォルト値なし） | `text NOT NULL` |

### 1.15 `wallet_settings` → 対応テーブルなし

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `wallet` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `settings` | — | 未移行（対応カラムなし、デフォルト値なし） | `text` |

### 1.16 `web3wallets` → 対応テーブルなし

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `tenant` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(128) DEFAULT ''::character varying NOT NULL` |
| `accountId` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `id` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `address` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(256) NOT NULL` |
| `ecosystem` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(128) NOT NULL` |
| `owner` | — | 未移行（対応カラムなし、デフォルト値なし） | `boolean NOT NULL` |

### 1.17 `x5clogins` → 対応テーブルなし

| v0.15.1 カラム | v1.0.0 カラム | 移行内容／移行後の値 | 旧 DB の型・DEFAULT |
|---|---|---|---|
| `tenant` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(128) DEFAULT ''::character varying NOT NULL` |
| `accountId` | — | 未移行（対応カラムなし、デフォルト値なし） | `uuid NOT NULL` |
| `x5cId` | — | 未移行（対応カラムなし、デフォルト値なし） | `character varying(256) NOT NULL` |

## 2. v1.0.0 の全テーブル・全カラム（新 → 旧／生成値）

以下は新 DB の全 33 カラムを対象とし、移行元と移行後の値を示します。

| v1.0.0 テーブル | v1.0.0 カラム | v0.15.1 のソースカラム | 移行後の値／DEFAULT |
|---|---|---|---|
| `wallet2_account_wallets` | `account_id` | `account_wallet_mapping.id` | `account_wallet_mapping.id`：UUID → 字符串 |
| `wallet2_account_wallets` | `wallet_id` | `account_wallet_mapping.wallet` | `account_wallet_mapping.wallet`：UUID → 字符串 |
| `wallet2_credential_stores` | `id` | `wallets.id` | `wallet-{walletId}-creds` |
| `wallet2_credentials` | `store_id` | `credentials.wallet` | `credentials.wallet`：生成 `wallet-{walletId}-creds` |
| `wallet2_credentials` | `id` | `credentials.id` | `credentials.id`：元の値を保持 |
| `wallet2_credentials` | `serialized_credential` | `credentials.document`、`credentials.disclosures` | `credentials.document`：CredentialParser.detectAndParse 后序列化；与 disclosures 合并；`credentials.disclosures`：非空时拼接 `document~disclosures` 后解析；与 document 合并 |
| `wallet2_credentials` | `label` | — | `NULL`（DEFAULT なし） |
| `wallet2_credentials` | `added_at` | —（旧 `credentials.added_on` は不使用） | `Instant.now()` |
| `wallet2_credentials` | `metadata` | — | `NULL`（DEFAULT なし） |
| `wallet2_did_stores` | `id` | `wallets.id` | `wallet-{walletId}-dids` |
| `wallet2_dids` | `store_id` | `wallet_dids.wallet` | `wallet_dids.wallet`：生成 `wallet-{walletId}-dids` |
| `wallet2_dids` | `did` | `wallet_dids.did` | `wallet_dids.did`：元の値を保持 |
| `wallet2_dids` | `document` | `wallet_dids.document` | `wallet_dids.document`：解析・再シリアライズ JSON；非 JSON 时替换成 {"id":"DID"} 占位文档 |
| `wallet2_key_stores` | `id` | `wallets.id` | `wallet-{walletId}-keys` |
| `wallet2_keys` | `store_id` | `wallet_keys.wallet` | `wallet_keys.wallet`：生成 `wallet-{walletId}-keys`，単純コピーではない |
| `wallet2_keys` | `key_id` | `wallet_keys.kid` | `wallet_keys.kid`：元の値を保持 |
| `wallet2_keys` | `key_type` | `wallet_keys.document` | 依据 wallet_keys.document 的 JWK crv/kty 推定；无法识别时 `unknown` |
| `wallet2_keys` | `serialized_key` | `wallet_keys.document` | `wallet_keys.document`：原始序列化 Key JSON 复制；同时解析出 key_type |
| `wallet2_keys` | `crypto2_stored_key` | — | `NULL`（DEFAULT なし） |
| `wallet2_wallet_credential_stores` | `wallet_id` | `wallets.id` | wallets.id → 字符串 |
| `wallet2_wallet_credential_stores` | `store_id` | `wallets.id` | `wallet-{walletId}-creds` |
| `wallet2_wallet_credential_stores` | `position` | — | `NULL`（DEFAULT なし） |
| `wallet2_wallet_did_stores` | `wallet_id` | `wallets.id` | wallets.id → 字符串 |
| `wallet2_wallet_did_stores` | `store_id` | `wallets.id` | `wallet-{walletId}-dids` |
| `wallet2_wallet_key_stores` | `wallet_id` | `wallets.id` | wallets.id → 字符串 |
| `wallet2_wallet_key_stores` | `store_id` | `wallets.id` | `wallet-{walletId}-keys` |
| `wallet2_wallet_key_stores` | `position` | — | `NULL`（DEFAULT なし） |
| `wallet2_wallets` | `id` | `wallets.id` | `wallets.id`：UUID → 字符串，保持原 ID |
| `wallet2_wallets` | `static_key` | — | `NULL`（DEFAULT なし） |
| `wallet2_wallets` | `crypto2_static_key` | — | `NULL`（DEFAULT なし） |
| `wallet2_wallets` | `static_did` | — | `NULL`（DEFAULT なし） |
| `wallet2_wallets` | `default_key_id` | — | `NULL`（DEFAULT なし） |
| `wallet2_wallets` | `default_did_id` | — | `NULL`（DEFAULT なし） |

## 3. 移行されない旧テーブル

次の 12 テーブルは公式 Migrator の移行対象外です。各テーブルの全カラムについては「1. v0.15.1 の全テーブル・全カラム」を参照してください。

| v0.15.1 テーブル | v1.0.0 対応テーブル | データの扱い |
|---|---|---|
| `accounts` | — | 全カラム未移行。新 DB に NULL の行が作成されるわけではない |
| `category` | — | 全カラム未移行。新 DB に NULL の行が作成されるわけではない |
| `credential_category` | — | 全カラム未移行。新 DB に NULL の行が作成されるわけではない |
| `entity_name_resolution_cache` | — | 全カラム未移行。新 DB に NULL の行が作成されるわけではない |
| `events` | — | 全カラム未移行。新 DB に NULL の行が作成されるわけではない |
| `notifications` | — | 全カラム未移行。新 DB に NULL の行が作成されるわけではない |
| `oidclogins` | — | 全カラム未移行。新 DB に NULL の行が作成されるわけではない |
| `wallet_issuers` | — | 全カラム未移行。新 DB に NULL の行が作成されるわけではない |
| `wallet_operation_histories` | — | 全カラム未移行。新 DB に NULL の行が作成されるわけではない |
| `wallet_settings` | — | 全カラム未移行。新 DB に NULL の行が作成されるわけではない |
| `web3wallets` | — | 全カラム未移行。新 DB に NULL の行が作成されるわけではない |
| `x5clogins` | — | 全カラム未移行。新 DB に NULL の行が作成されるわけではない |

## 4. 重要な確認事項

- `wallet2_wallets.default_key_id` / `default_did_id` は `NULL`。旧 DID の `keyId` / `default` は移行されません。
- `wallet2_keys.crypto2_stored_key` は `NULL`。旧 Key は `serialized_key` に保存されます。
- `wallet2_credentials.label` / `metadata` は `NULL`。`added_at` は元の追加日時ではなく移行実行日時です。
- 旧 Credential の `deleted_on` / `pending` は移行時の抽出条件に使われないため、削除済み／保留中データも取り込まれる可能性があります。
- `wallet2_account_wallets` に保存されるのは Account ID と Wallet ID のみで、旧 `tenant` と `permissions` は移行されません。
- 移行件数が一致することと、API2 での Key／DID／VC の使用可否は別途確認が必要です。

## 5. 参照情報

- [WalletMigration.kt（walt.id v1.0.0）](https://github.com/walt-id/waltid-identity/blob/v1.0.0/waltid-services/waltid-wallet-migration/src/main/kotlin/id/walt/wallet/migration/WalletMigration.kt)
- v0.15.1 および v1.0.0 の PostgreSQL Schema（移行前に取得した構造情報）
