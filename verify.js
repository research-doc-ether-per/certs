

## walt.id v0.15.1 → v1.0.0 DB マイグレーション手順

### 1. 移行元データベースの確認

現在の PostgreSQL データベース一覧を確認する。

```bash
docker exec -e PGPASSWORD=waltid -it \
  docker-compose-postgres-1 \
  psql -U waltid -d postgres -c "\l"
```

### 2. 移行元データベースの作成

v0.15.1 のバックアップデータを復元するため、移行元データベースを作成する。

※ `waltid_v0151_source` が既に存在する場合、この手順は不要。

```bash
docker exec -e PGPASSWORD=waltid -it \
  docker-compose-postgres-1 \
  psql -U waltid -d postgres \
  -c "CREATE DATABASE waltid_v0151_source OWNER waltid;"
```

### 3. v0.15.1 データベースの復元

事前に取得した v0.15.1 のバックアップファイルから、移行元データベースにデータを復元する。

※ 空のデータベースに対して実行すること。復元済みの場合は再実行しない。

```bash
docker exec -e PGPASSWORD=waltid -i \
  docker-compose-postgres-1 \
  pg_restore -U waltid \
  -d waltid_v0151_source \
  --no-owner --no-acl --exit-on-error \
  < ./migration/v0151/waltid_v0151_full.dump
```

### 4. 復元結果の確認

復元したデータベースのテーブル一覧を確認する。

```bash
docker exec -e PGPASSWORD=waltid -it \
  docker-compose-postgres-1 \
  psql -U waltid -d waltid_v0151_source \
  -c "\dt public.*"
```

### 5. 移行対象データ件数の確認

移行元データベースに登録されているユーザー、Wallet、Key、DID、Credential、およびアカウントと Wallet の紐付け件数を確認する。

```bash
docker exec -e PGPASSWORD=waltid -i \
  docker-compose-postgres-1 \
  psql -U waltid -d waltid_v0151_source \
  -c "
SELECT 'accounts' AS table_name, COUNT(*) FROM public.accounts
UNION ALL
SELECT 'wallets', COUNT(*) FROM public.wallets
UNION ALL
SELECT 'wallet_keys', COUNT(*) FROM public.wallet_keys
UNION ALL
SELECT 'wallet_dids', COUNT(*) FROM public.wallet_dids
UNION ALL
SELECT 'credentials', COUNT(*) FROM public.credentials
UNION ALL
SELECT 'account_wallet_mapping', COUNT(*)
FROM public.account_wallet_mapping;
"
```

現在確認済みの件数：

| テーブル | 件数 |
|---|---:|
| accounts | 5 |
| wallets | 5 |
| wallet_keys | 6 |
| wallet_dids | 6 |
| credentials | 6 |
| account_wallet_mapping | 5 |

### 6. PostgreSQL の接続ポート確認

ホスト側から PostgreSQL に接続できることを確認する。

```bash
docker port docker-compose-postgres-1 5432
```

ホスト側のポートが `5432` の場合、JDBC 接続先には `localhost:5432` を使用する。

### 7. Migration Tool の Dry Run

walt.id v1.0.0 のプロジェクトルートディレクトリ（`gradlew` が配置されているディレクトリ）で実行する。

`--dry-run` を指定し、実際のデータ移行を行わずに、移行対象データの読み取りと変換処理を確認する。

```bash
./gradlew :waltid-services:waltid-wallet-migration:run \
  --args="--source jdbc:postgresql://localhost:5432/waltid_v0151_source?user=waltid&password=waltid --target jdbc:postgresql://localhost:5432/waltid?user=waltid&password=waltid --dry-run"
```

以下の内容を確認する。

- Wallet、Key、DID、Credential の処理件数
- Account-Wallet の紐付け件数
- UUID の変換エラーの有無
- Credential の解析エラーの有無
- その他の警告・エラーの有無

※ Dry Run でも移行先 DB の初期化処理が呼び出されるため、完全な読み取り専用処理ではない。

### 8. Migration Tool の実行

Dry Run で問題がないことを確認した後、`--dry-run` を外して本番の移行処理を実行する。

※ 移行先は事前に確認した v1.0.0 の空の Wallet2 テーブルとする。

```bash
./gradlew :waltid-services:waltid-wallet-migration:run \
  --args="--source jdbc:postgresql://localhost:5432/waltid_v0151_source?user=waltid&password=waltid --target jdbc:postgresql://localhost:5432/waltid?user=waltid&password=waltid"
```

### 9. 移行結果の確認

移行先データベースの Wallet、Key、DID、Credential、アカウント紐付け件数を確認する。

```bash
docker exec -e PGPASSWORD=waltid -i \
  docker-compose-postgres-1 \
  psql -U waltid -d waltid \
  -c "
SELECT 'wallets' AS table_name, COUNT(*) FROM public.wallet2_wallets
UNION ALL
SELECT 'keys', COUNT(*) FROM public.wallet2_keys
UNION ALL
SELECT 'dids', COUNT(*) FROM public.wallet2_dids
UNION ALL
SELECT 'credentials', COUNT(*) FROM public.wallet2_credentials
UNION ALL
SELECT 'account_wallet_mapping', COUNT(*)
FROM public.wallet2_account_wallets;
"
```

移行元データベースの件数と比較し、差異がないことを確認する。

※ 件数が一致していても、Key の署名処理、DID の参照、Credential の取得・提示など、Wallet API2 による動作確認が別途必要。

### 補足事項

- 公式 Migration Tool は `accounts` テーブル自体の移行には対応していない。
- ユーザーアカウント、パスワードハッシュ、Wallet 権限の移行は別途実装する。
- 移行処理中は Wallet API2 から対象 DB への書き込みを停止する。
- データの移行に失敗した場合はログを確認し、必要に応じて移行先のテーブルを初期化して再実行する。
- 上記の接続情報はローカル開発環境向けの例であり、本番環境ではパスワードをコマンド引数に直接指定しない。
