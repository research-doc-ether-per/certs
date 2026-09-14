
Wallet2 の Persistence では、SQLite または PostgreSQL を使用できます。

使用する DB は `wallet2-persistence.conf` の JDBC 接続設定によって切り替えます。

#### 2.2.1 SQLite を使用する場合

`wallet2-persistence.conf` を変更していない場合、または JDBC 接続設定を SQLite に戻した場合は、SQLite が使用されます。

SQLite の DB ファイルは Wallet API2 コンテナ内の `wallet2.db` に作成されます。

```bash
# sqlite3 のインストール
cd ~/
sudo apt update
sudo apt install sqlite3

# Wallet API2 コンテナから DB ファイルを取得
cd ~/workspace/cloudcredentialservice
docker cp docker-compose-wallet-api2-1:/waltid-wallet-api2/data/wallet2.db ./wallet2.db

# テーブル一覧の確認
sqlite3 wallet2.db ".tables" --newline

# テーブル構造のエクスポート
sqlite3 wallet2.db ".schema" > wallet2_sqlite_schema.sql

# テーブルデータのエクスポート
sqlite3 wallet2.db ".dump --data-only" > wallet2_sqlite_dump.sql
```

#### 2.2.2 PostgreSQL を使用する場合

`wallet2-persistence.conf` の JDBC 接続設定を PostgreSQL 用に変更し、Wallet API2 を再起動すると PostgreSQL が使用されます。

Wallet2 の Persistence 初期化時に、必要なテーブルが PostgreSQL 上に自動作成されます。

以下のコマンドで、テーブル構造およびデータを確認できます。
```bash
# テーブルデータのエクスポート
PGPASSWORD='waltid' docker exec -i docker-compose-postgres-1 \
  pg_dump -U waltid -d waltid --data-only --inserts \
  > ./wallet2_postgres_dump.sql

# テーブル構造のエクスポート
PGPASSWORD='waltid' docker exec -i docker-compose-postgres-1 \
  pg_dump -U waltid -d waltid --schema-only \
  > ./wallet2_postgres_schema.sql

# PostgreSQL に接続
docker exec -e PGPASSWORD=waltid -it docker-compose-postgres-1 \
  psql -U waltid -d waltid

# テーブル一覧の確認
\dt
```
#### 2.2.3 テーブル一覧

SQLite / PostgreSQL ともに、Wallet2 Persistence では以下のテーブルが作成されます。
