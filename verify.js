# waltid-custom-migration

## 概要

`waltid-custom-migration` は、walt.id v0.15.1 から v1.0.0 へのデータベース移行時に、公式の `waltid-wallet-migration` では移行されないユーザー関連情報を移行するための JavaScript ツールです。

公式ツールでは Wallet・Key・DID・Credential、およびアカウントと Wallet の関連（`wallet2_account_wallets`）を移行しますが、次の情報は移行対象外です。

- アカウント情報（`accounts`）
- OIDC ログイン情報（`oidclogins`）
- アカウントと Wallet の権限情報（`account_wallet_mapping.permissions`）

これらの情報を保持するため、v1.0.0 側の PostgreSQL にカスタムスキーマ `wallet_app` を作成し、必要なユーザー関連情報を移行します。既存の `wallet2_*` テーブルへの書き込みは行いません。

> 本ツールはデータ移行のみを対象とします。移行後のアカウントを Wallet API2 のログイン処理や権限判定で利用するには、別途アプリケーション側の連携実装が必要です。

## 動作環境

- Node.js 22 以上
- PostgreSQL（移行元：v0.15.1、移行先：v1.0.0）
- JavaScript（CommonJS）
- npm パッケージ：`pg`、`dotenv`
## package.json の scripts

```json
{
  "scripts": {
    "db:init": "node src/index.js init",
    "migrate:dry-run": "node src/index.js migrate --dry-run",
    "migrate": "node src/index.js migrate",
    "verify": "node src/index.js verify",
    "check": "node --check src/index.js"
  }
}
```
## ディレクトリ構成

```text
waltid-custom-migration/
├── src/
│   └── index.js
├── sql/
│   └── schema.sql
├── .env
├── .env.example
├── package.json
└── README.md
```

## 移行対象

| 移行元（v0.15.1） | 移行先（v1.0.0 / `wallet_app`） | 内容 |
|---|---|---|
| `accounts` | `accounts` | アカウント ID、名前、メールアドレス、パスワードハッシュ、作成日時 |
| `oidclogins` | `account_oidc_logins` | OIDC 識別子と既存アカウント ID の関連 |
| `account_wallet_mapping` | `account_wallet_permissions` | アカウント ID、Wallet ID、権限、関連追加日時 |

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

#### account_wallet_mapping → wallet_app.account_wallet_permissions

| v0.15.1 カラム | v1.0.0 カラム | 処理 |
|---|---|---|
| `id` | `account_id` | 元のアカウント ID を保持。複合主キー |
| `wallet` | `wallet_id` | 元の Wallet ID を保持。複合主キー |
| `permissions` | `permissions` | 元の値を保持。値がなければ `NULL` |
| `added_on` | `added_on` | 文字列として保持。値がなければ `NULL` |
| `tenant` | — | 移行しない |

### 移行先テーブル

```text
wallet_app.accounts
wallet_app.account_oidc_logins
wallet_app.account_wallet_permissions
```

各テーブルの主キー・カラム型・検索用インデックスは `sql/schema.sql` を参照してください。`raw` および `legacy_rows` は使用しません。

## セットアップ

### 1. 依存関係のインストール

```bash
node -v
npm install
```

`package.json` には `"type": "commonjs"` を設定します。

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成します。

```bash
cp .env.example .env
```

設定例：

```dotenv
SOURCE_DATABASE_URL=postgresql://waltid:<SOURCE_PASSWORD>@localhost:5432/waltid_v0151_source
TARGET_DATABASE_URL=postgresql://waltid:<TARGET_PASSWORD>@localhost:5432/waltid
SOURCE_SCHEMA=public
TARGET_SCHEMA=wallet_app
```

`<SOURCE_PASSWORD>` と `<TARGET_PASSWORD>` は実際のパスワードに置き換えてください。パスワードに `@`、`#`、`%` などが含まれる場合は URL エンコードが必要です。`.env` は Git にコミットしないでください。

### 3. 構文チェック

```bash
npm run check
```

### 4. テーブル初期化

```bash
npm run db:init
```

`wallet_app` スキーマと 3 つの移行先テーブル、および検索用インデックスを作成します。`CREATE TABLE IF NOT EXISTS` は既存テーブルの定義を更新しないため、旧定義（`tenant` や `raw` を含むテーブルなど）が残っている場合は事前に確認してください。

### 5. Dry Run

```bash
npm run migrate:dry-run
```

移行処理をトランザクション内で実行し、最後に `ROLLBACK` します。成功時にもデータは確定されません。`db:init` を実行済みの場合、既存のテーブル定義はそのまま保持されます。

### 6. 移行実行

```bash
npm run migrate
```

アカウント・Wallet 権限情報は主キーに基づいて UPSERT されます。OIDC ログイン情報は既存の組み合わせがあれば重複挿入しません。移行先のレコードを自動削除する処理はありません。

### 7. 移行結果の検証

```bash
npm run verify
```

次の項目を確認します。

- 3 テーブルの移行元・移行先の件数およびカラム値
- OIDC ログイン情報に対応するアカウントの存在
- Wallet 権限情報に対応するアカウントの存在
- 公式ツールが作成した `public.wallet2_account_wallets` との関連

`wallet2_account_wallets` が `public` 以外のスキーマに存在する場合、現在の `index.js` の検証 SQL を環境に合わせて修正してください。検証に失敗した場合は終了コードが `1` になります。

## ログイン情報について

### メールアドレス・パスワード認証

旧 `accounts.password` のパスワードハッシュを `wallet_app.accounts.password_hash` に保存します。平文パスワードへの変換や再ハッシュ化は行いません。ログイン機能を引き継ぐ場合は、旧ハッシュ方式に対応した検証処理を Wallet API2 側に実装する必要があります。

### OIDC 認証

旧 `oidclogins.accountId` と `oidclogins.oidcId` を保存して、OIDC 識別子と元のアカウントの関連を維持します。OIDC プロバイダーの設定・クライアント設定・認証フローは移行しません。必要に応じて issuer と subject の対応をアプリケーション側で確認してください。

同じアカウントがメール・パスワード認証と OIDC 認証の両方を利用する場合も、元の `account_id` を共通 ID として扱います。

## 注意事項

- 公式 `waltid-wallet-migration` による Wallet・Key・DID・Credential・Account-Wallet 関連の移行が完了していることを前提とします。
- Custom Migration Tool は公式 `wallet2_*` テーブルへ書き込みません。
- `tenant`、`raw`、`legacy_rows` は移行先の業務テーブルでは使用しません。
- 元データの UUID などの識別子はテキストとして保存します。
- `created_on` と `added_on` は PostgreSQL の日時型ではなく `TEXT` として保存します。
- 原則として既存の移行先データをバックアップしてから実行してください。
- 本ツールは既存レコードを自動削除しません。移行元からレコードが削除されても、移行先には残る場合があります。
- 旧ユーザーの実際のログイン可否や権限チェックは、このツールだけでは保証されません。

## 主な実行コマンド

| コマンド | 内容 |
|---|---|
| `npm run check` | JavaScript の構文チェック |
| `npm run db:init` | カスタムスキーマ・テーブル作成 |
| `npm run migrate:dry-run` | ロールバック付きの移行確認 |
| `npm run migrate` | データ移行 |
| `npm run verify` | 移行結果の照合 |
