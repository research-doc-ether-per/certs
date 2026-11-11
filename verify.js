# Account / Wallet / DID Migration

## 対象

- 移行元：walt.id PostgreSQL（読み取りのみ）
- 移行先：Cloud Wallet PostgreSQL
- `priv_wallets.waltid_wallet` を UUID NOT NULL から VARCHAR(128) NULL に変更
- `priv_wallets.account_id VARCHAR(128) NOT NULL` を追加
- `priv_wallets` の主キーを `(user_id, account_id)` に変更
- `account_wallets` / `did_aliases` を追加し、walt.id の対応データを移行
- `org_wallet_id` は変更しない

## 既存データの対応ルール

旧仕様では Account : Wallet は厳密に 1:1 です。移行時は、Cloud Wallet の `priv_wallets.waltid_wallet` と walt.id の `account_wallet_mapping.wallet` を比較し、`account_wallet_mapping.id` を `priv_wallets.account_id` に設定します。

walt.id の旧 `account_wallet_mapping` 内で、同一 Account に複数 Wallet、同一 Wallet に複数 Account、または同一組の重複行がある場合は処理を中止します。OIDC ログインは `oidclogins.oidcId` と一致する場合のみ補助的に検証します。メールログインはメールアドレスを Account ID として扱いません。

このスクリプトは**旧1:1データの初回移行専用**です。移行後の API が 1 Account : N Wallet に対応した場合、再び `migrate` コマンドを実行しないでください。`verify` は移行後の 1:N を禁止しません。


## 実行

```bash
node migrate_wallet_data.js migrate --dry-run --print-data
node migrate_wallet_data.js migrate --apply
node migrate_wallet_data.js verify
```

DRY RUN では DDL とデータ更新をトランザクション内で試行し、最後に ROLLBACK します。`--print-data` は実データ（ユーザーID、Wallet ID、Account ID、DID、Aliasなど）を標準出力に出すため、機密情報として扱ってください。

## 必須の事前確認

- Cloud Wallet DB と walt.id DB のバックアップを取得し、実行中は書き込みを停止する
- walt.id DB が移行対象の**旧版1:1データ**であること（既に1:NになったDBを対象にしない）
- 旧 Wallet ID が walt.id `account_wallet_mapping.wallet` と一致すること
- `priv_wallets(user_id)` を参照する外部キーがあれば、主キー変更前にアプリケーションおよび外部キーを見直すこと
- Cloud Wallet に `account_wallets` / `did_aliases` が既にある場合、既存の列定義と制約に互換性があること
- 2つのDB間の分散トランザクションは行わないため、移行中にデータが更新されないようにすること
- `added_on` / `created_on` に TIMESTAMP として格納可能な値が入っていること
- `org_wallet_id` の ID・パスワードは移行対象外

### 注意

`migrate` は移行後の複合主キーを検出すると中止します。これは将来の多Wallet運用データへ旧Migrationを再適用しないための保護です。
