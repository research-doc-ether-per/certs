# walt.id v0.15.1 → v1.0.0：カスタム移行ツール（JavaScript）

## 概要

`waltid-custom-migration` は、walt.id v0.15.1 から v1.0.0 へのデータベース移行時に、公式の `waltid-wallet-migration` では移行されないユーザー関連情報を移行するための JavaScript ツールです。

公式ツールでは Wallet・Key・DID・Credential、およびアカウントと Wallet の関連（`wallet2_account_wallets`）を移行しますが、以下の情報は移行対象外です。

- アカウント情報（`accounts`）
- OIDC ログイン情報（`oidclogins`）
- Wallet 名（`wallets.name`）
- DID Alias（`wallet_dids.alias`）

これらの情報を保持するため、v1.0.0 側の PostgreSQL にカスタムスキーマ `wallet_app` を作成し、必要なユーザー関連情報を移行します。既存の `wallet2_*` テーブルへの書き込みは行いません。

> 本ツールはデータ移行のみを対象とします。移行後のデータは、アプリケーション側で Account・Wallet・DID・Key の関連情報を参照するために使用します。

## 前提条件

```bash
# パッケージのインストール
cd ~/workspace/cloudcredentialservice/samples/v1.0.0_migration_DB
npm install
```

## 実施手順

```bash
cd ~/workspace/cloudcredentialservice/samples/v1.0.0_migration_DB

# テーブル初期化
# wallet_app スキーマと4つの移行先テーブル、および検索用インデックスを作成
npm run db:init

# トランザクション内で全処理して ROLLBACK（保存しない）
npm run migrate:dry-run

# 実データ移行
npm run migrate

# 移行結果の検証
npm run verify
```

### 移行先データベースの既存データ削除

```bash
# wallet_app スキーマと配下のすべてのテーブル・データを削除する
docker exec -e PGPASSWORD=waltid -i \
  docker-compose-postgres-1 \
  psql -U waltid -d waltid \
  -c "DROP SCHEMA IF EXISTS wallet_app CASCADE;"
```

```bash
# wallet_app のデータのみを削除し、テーブル構造は保持する
docker exec -e PGPASSWORD=waltid -i \
  docker-compose-postgres-1 \
  psql -U waltid -d waltid \
  -c "TRUNCATE TABLE
      wallet_app.accounts,
      wallet_app.account_oidc_logins,
      wallet_app.account_wallets,
      wallet_app.did_aliases;"
```

## 移行対象

| 移行元（v0.15.1） | 移行先（v1.0.0 / `wallet_app`） | 内容 |
|---|---|---|
| `accounts` | `accounts` | アカウント ID、名前、メールアドレス、パスワードハッシュ、作成日時 |
| `oidclogins` | `account_oidc_logins` | OIDC 識別子と既存アカウント ID の関連 |
| `account_wallet_mapping` | `account_wallets` | アカウント ID、Wallet ID、関連追加日時 |
| `wallets` | `account_wallets` | Wallet 名 |
| `wallet_dids` | `did_aliases` | Wallet ID、DID、Alias、作成日時 |

### カラムマッピング

#### accounts → wallet_app.accounts

| v0.15.1 カラム | v1.0.0 カラム | 処理 |
|---|---|---|
| `id` | `account_id` | 元の値を保持。主キー |
| `name` | `name` | 元の値を保持。値がなければ `NULL` |
| `email` | `email` | 元の値を保持。値がなければ `NULL` |
| `password` | `password_hash` | ハッシュ文字列をそのまま保持。値がなければ `NULL` |
| `createdOn` | `created_on` | 文字列として保持。値がなければ `NULL` |
| `tenant` | — | 移行しない |

#### oidclogins → wallet_app.account_oidc_logins

| v0.15.1 カラム | v1.0.0 カラム | 処理 |
|---|---|---|
| `accountId` | `account_id` | 元の値を保持。複合主キー |
| `oidcId` | `oidc_id` | 元の値を保持。複合主キー |
| `tenant` | — | 移行しない |

#### account_wallet_mapping → wallet_app.account_wallets

| v0.15.1 カラム | v1.0.0 カラム | 処理 |
|---|---|---|
| `id` | `account_id` | 元のアカウント ID を保持。複合主キー |
| `wallet` | `wallet_id` | 元の Wallet ID を保持。複合主キー |
| `added_on` | `added_on` | 文字列として保持。値がなければ `NULL` |
| `permissions` | — | 移行しない |
| `tenant` | — | 移行しない |

#### wallets → wallet_app.account_wallets

| v0.15.1 カラム | v1.0.0 カラム | 処理 |
|---|---|---|
| `id` | — | `account_wallet_mapping.wallet` と紐付けるために使用 |
| `name` | `wallet_name` | 対応する Wallet 名を保持 |
| `createdOn` | — | 移行しない |

#### wallet_dids → wallet_app.did_aliases

| v0.15.1 カラム | v1.0.0 カラム | 処理 |
|---|---|---|
| `wallet` | `wallet_id` | 元の Wallet ID を保持。複合主キー |
| `did` | `did` | 元の DID を保持。複合主キー |
| `alias` | `alias` | 元の Alias を保持 |
| `createdOn` | `created_on` | 文字列として保持 |
| `document` | — | 移行しない |
| `keyId` | — | 移行しない |
| `default` | — | 移行しない |

# ログイン関連データ確認ツール

データ移行後、`src/login-data-test.js` を使用して、移行済みアカウントと Wallet 関連データを確認します。

## 利用手順

```bash
cd ~/workspace/cloudcredentialservice/samples/v1.0.0_migration_DB

# 必要に応じて login-data-test.js のテスト内容を設定
npm run login:test
```

以下の情報が取得できることを確認します。

- `accountId`
- `wallets`
  - `walletId`
  - `walletName`
  - `defaultDid`
  - `defaultKeyId`
  - `addedOn`
  - `dids`
    - `did`
    - `alias`
    - `keyId`
