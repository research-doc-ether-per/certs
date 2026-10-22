# wallet_app スキーマと配下のすべてのテーブル・データを削除する。
docker exec -e PGPASSWORD=waltid -i \
  docker-compose-postgres-1 \
  psql -U waltid -d waltid \
  -c "DROP SCHEMA IF EXISTS wallet_app CASCADE;"

# wallet_app のデータのみを削除し、テーブル構造は保持する。
docker exec -e PGPASSWORD=waltid -i \
  docker-compose-postgres-1 \
  psql -U waltid -d waltid \
  -c "TRUNCATE TABLE
    wallet_app.accounts,
    wallet_app.account_oidc_logins,
    wallet_app.account_wallet_permissions;"
