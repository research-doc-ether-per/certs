# Cloud Wallet DB Migration

walt.id v1.0.0 の Wallet 情報および DID エイリアス情報を Cloud Wallet DB に移行します。

## 1. 移行対象

| 移行元（walt.id DB） | 移行先（Cloud Wallet DB） | 移行内容 |
|---|---|---|
| `wallets` | `wallet_aliases` | Wallet ID、Wallet 名、作成日時 |
| `wallet_dids` | `did_aliases` | Wallet ID、DID、エイリアス、作成日時 |

### wallet_aliases

| カラム | データ型 | 説明 |
|---|---|---|
| `waltid_wallet_id` | VARCHAR(128) NOT NULL | walt.id の Wallet ID（主キー） |
| `wallet_name` | VARCHAR(128) | Wallet 名 |
| `added_on` | TIMESTAMP | 作成日時 |

### did_aliases

| カラム | データ型 | 説明 |
|---|---|---|
| `waltid_wallet_id` | VARCHAR(128) NOT NULL | walt.id の Wallet ID（複合主キー） |
| `did` | VARCHAR(1024) NOT NULL | DID（複合主キー） |
| `alias` | VARCHAR(1024) NOT NULL | DID エイリアス |
| `created_on` | TIMESTAMP | 作成日時 |

既存の `priv_wallets` テーブルは移行対象外です。`waltid_wallet` カラムを使用して、walt.id DB の Wallet ID との整合性を確認します。

## 2. 接続設定

`config/db.json` の `cloudWallet`（Cloud Wallet DB、5433）と `waltId`（walt.id DB、5432）を設定します。

各接続では、`host`、`port`、`user`、`password`、`database`、`ssl` を使用します。`schema` は省略可能で、省略時は `public` を使用します。

パスワードは環境に合わせて設定し、設定ファイルをリポジトリへコミットしないでください。

## 3. 実行方法

### 3.1 事前確認（Dry Run）

```bash
node migrate_wallet_data.js migrate --dry-run
```

移行元データの取得、整合性確認、移行先への登録・更新、移行結果の検証を実行します。

処理終了時に `ROLLBACK` するため、Cloud Wallet DB への変更は保存されません。

`--apply` を指定しない場合も Dry Run となります。

### 3.2 本番移行（Apply）

```bash
node migrate_wallet_data.js migrate --apply
```

移行処理と検証が正常に完了した場合、`COMMIT` して変更を保存します。

エラーが発生した場合は `ROLLBACK` します。

既存データは Wallet ID または Wallet ID と DID の組み合わせをキーとして更新します。

### 3.3 移行結果の確認（Verify）

```bash
node migrate_wallet_data.js verify
```

Cloud Wallet DB のテーブル定義、主キー、登録件数および `priv_wallets` との参照整合性を確認します。

`verify` は移行元の walt.id DB には接続しません。

### 3.4 データ出力

```bash
node migrate_wallet_data.js migrate --dry-run --print-data
```

`--print-data` を指定すると、移行元データ、変換後データなどを標準出力へ表示します。

## 4. 確認内容

移行処理では、以下を確認します。

1. 移行元テーブルの必須カラムが存在すること。
2. Wallet ID および Wallet と DID の組み合わせに重複がないこと。
3. `wallet_dids` の Wallet ID が `wallets` に存在すること。
4. `priv_wallets.waltid_wallet` が移行元の Wallet ID に存在すること。
5. 移行先テーブルのカラム定義と主キーが正しいこと。
6. 移行元と移行先の Wallet 名、DID エイリアスおよび日時が一致すること。

## 5. 注意事項

- 実行前に Cloud Wallet DB のバックアップを取得してください。
- `priv_wallets.waltid_wallet` は `VARCHAR(128) NOT NULL` としてください。
- `wallet_aliases` と `did_aliases` の Wallet ID カラム名は `waltid_wallet_id` を使用します。
- 移行先テーブルが存在しない場合は自動作成します。
- 既存テーブルのカラム名やデータ型は自動変更しません。
- 移行先に存在するデータのうち、移行元に存在しないレコードは削除しません。
- `--apply` の実行前に、必ず Dry Run で正常終了することを確認してください。

## 6. ログ

実行ログは以下のファイルに出力します。

```text
logs/migrate_wallet_data.log
```

エラー発生時はログを確認してください。
