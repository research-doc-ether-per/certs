
## 7.1 Wallet2 関連ツール

Wallet2 v1.0.0 の認証、Persistence、Wallet、Key、DID などの機能について、セットアップおよび一連の動作確認を行うため、以下のツールを作成しました。

| ファイル名 | 説明 |
|---|---|
| `wallet2-auth-on.js` | Wallet2 の `auth` 機能を有効化し、認証に必要な設定を行います。 |
| `wallet2-auth-off.js` | Wallet2 の `auth` 機能を無効化します。 |
| `wallet2-persistence-change.js` | Wallet2 の Persistence 設定を切り替えます。`postgres` を指定した場合は PostgreSQL、`sqlite` を指定した場合は SQLite に変更します。 |
| `wallet2-scenario-with-auth.js` | `auth` 機能を有効化した状態で、ユーザー登録から Wallet、Key、DID の作成・確認・削除までの一連の処理を行います。 |
| `wallet2-scenario-without-auth.js` | `auth` 機能を無効化した状態で、Wallet、Key、DID の作成・確認・削除までの一連の処理を行います。 |


  ### Persistence 設定を切り替えて確認する場合

```bash
# PostgreSQL に切り替える場合
node wallet2-persistence-change.js postgres

# SQLite に切り替える場合
node wallet2-persistence-change.js sqlite

# Persistence 設定変更後、walt.id を再起動する

# `auth` 機能を使用する場合
node wallet2-scenario-with-auth.js

# `auth` 機能を使用しない場合
node wallet2-scenario-without-auth.js
```


また、Persistence の設定を変更することで、保存先を PostgreSQL に切り替えられることを確認しました。
PostgreSQL を使用する場合は、`wallet2-persistence.conf` の JDBC 接続設定を PostgreSQL 用に変更し、Wallet API を再起動します。
切り替え後、PostgreSQL 側に Wallet2 用のテーブルが自動作成され、Wallet、Key、DID などのデータが PostgreSQL に保存されることを確認しました。
SQLite に戻す場合も、同じ設定ファイルを SQLite 用に変更することで切り替え可能です。
